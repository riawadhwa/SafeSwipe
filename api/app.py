from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import json
import warnings
import sqlite3
import hashlib
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import quote
from urllib.request import urlopen
from pathlib import Path

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# ---------------- Load artifacts ----------------
ROOT_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT_DIR / "model"
DB_PATH = Path(__file__).resolve().parent / "risk_events.db"

RULE_MULTIPLE_CARDS = "multiple_credit_cards_check"
RULE_FLAGGED_ENTITY = "flagged_ip_email_mac_check"
RULE_UNUSUAL_DOMAIN = "unusual_email_domain_check"
RULE_TX_FREQUENCY = "transaction_frequency_check"
RULE_BILLING_SHIPPING = "billing_shipping_mismatch_check"
RULE_VPN = "vpn_detection"

RULE_KEYS = {
    RULE_MULTIPLE_CARDS,
    RULE_FLAGGED_ENTITY,
    RULE_UNUSUAL_DOMAIN,
    RULE_TX_FREQUENCY,
    RULE_BILLING_SHIPPING,
    RULE_VPN,
}

model_path_candidates = [
    MODEL_DIR / "stacking_rf_xgb.pkl",
    MODEL_DIR / "xgboost.pkl",
    MODEL_DIR / "random_forest.pkl",
    MODEL_DIR / "logistic_regression.pkl",
]

model_path = next((p for p in model_path_candidates if p.exists()), None)
if model_path is None:
    raise FileNotFoundError(
        "No model .pkl file found in model/. Expected one of: "
        + ", ".join(p.name for p in model_path_candidates)
    )

with warnings.catch_warnings():
    warnings.filterwarnings(
        "ignore",
        message=r".*If you are loading a serialized model.*",
        category=UserWarning,
    )
    model = joblib.load(model_path)

print(f"Loaded model artifact: {model_path.name}")
scaler = joblib.load(MODEL_DIR / "scaler.pkl")

with open(MODEL_DIR / "features.json") as f:
    MODEL_FEATURES = json.load(f)

# ---------------- Feature builder ----------------
from feature_engineering import build_model_features   # SAME FUNCTION USED IN TRAINING


def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS cards (
                card_hash TEXT PRIMARY KEY,
                last4 TEXT,
                bin6 TEXT,
                first_seen TEXT,
                last_seen TEXT,
                total_uses INTEGER DEFAULT 0
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT,
                card_hash TEXT,
                customer_email TEXT,
                customer_name TEXT,
                amount REAL,
                ip TEXT,
                is_proxy INTEGER,
                is_vpn INTEGER,
                is_hosting INTEGER,
                device_id TEXT,
                ml_confidence REAL,
                risk_score REAL,
                status TEXT,
                reasons TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS customer_profiles (
                email TEXT PRIMARY KEY,
                name TEXT,
                first_seen TEXT,
                last_seen TEXT,
                total_transactions INTEGER DEFAULT 0
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS city_population_cache (
                city_key TEXT PRIMARY KEY,
                city_name TEXT,
                population INTEGER,
                fetched_at TEXT
            )
            """
        )


def get_client_ip(req):
    forwarded = req.headers.get("X-Forwarded-For", "").strip()
    if forwarded:
        return forwarded.split(",")[0].strip()
    return (req.remote_addr or "").strip()


def normalize_card_number(card_number):
    return re.sub(r"\D", "", str(card_number or ""))


def card_fingerprint(card_number):
    digits = normalize_card_number(card_number)
    if not digits:
        return "", "", ""
    digest = hashlib.sha256(digits.encode("utf-8")).hexdigest()
    return digest, digits[-4:], digits[:6]


def fetch_json(url, timeout=2.5):
    try:
        with urlopen(url, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return {}


def lookup_ip_risk(ip):
    if not ip or ip.startswith("127.") or ip == "::1" or ip.startswith("192.168."):
        return {"ip": ip, "is_vpn": False, "is_proxy": False, "is_hosting": False}

    # ip-api includes proxy/hosting/mobile on free endpoint (best-effort)
    data = fetch_json(
        f"http://ip-api.com/json/{quote(ip)}?fields=status,query,proxy,hosting,mobile"
    )
    if data.get("status") != "success":
        return {"ip": ip, "is_vpn": False, "is_proxy": False, "is_hosting": False}

    return {
        "ip": data.get("query", ip),
        "is_vpn": bool(data.get("proxy", False)),
        "is_proxy": bool(data.get("proxy", False)),
        "is_hosting": bool(data.get("hosting", False) or data.get("mobile", False)),
    }


def city_from_address(address):
    parts = [p.strip() for p in str(address or "").split(",") if p.strip()]
    if not parts:
        return ""
    if len(parts) >= 2:
        return parts[-2]
    return parts[0]


def lookup_city_population(city_name):
    city_key = (city_name or "").strip().lower()
    if not city_key:
        return 150000

    now = datetime.now(timezone.utc).isoformat()

    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT population FROM city_population_cache WHERE city_key = ?",
            (city_key,),
        ).fetchone()
        if row and row[0]:
            return int(row[0])

    # Open-Meteo geocoding API (no key) includes population for many cities
    geo = fetch_json(
        f"https://geocoding-api.open-meteo.com/v1/search?name={quote(city_name)}&count=1&language=en&format=json"
    )
    results = geo.get("results") or []
    population = int(results[0].get("population", 150000)) if results else 150000

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO city_population_cache (city_key, city_name, population, fetched_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(city_key) DO UPDATE SET
                city_name=excluded.city_name,
                population=excluded.population,
                fetched_at=excluded.fetched_at
            """,
            (city_key, city_name, population, now),
        )

    return population


def ml_confidence_from_payload(payload):
    df = pd.DataFrame([{
        "amt": payload["amt"],
        "category": payload["category"],
        "gender": payload["gender"],
        "dob": payload["dob"],
        "city_pop": payload["city_pop"],
        "lat": payload["lat"],
        "long": payload["long"],
        "merch_lat": payload["merch_lat"],
        "merch_long": payload["merch_long"],
        "trans_date_trans_time": payload["trans_date_trans_time"],
    }])

    X = build_model_features(df)
    X = X[MODEL_FEATURES]
    X_scaled = scaler.transform(X)
    return float(model.predict_proba(X_scaled)[0][1])


def get_card_streak(card_hash):
    # Consecutive streak in latest transactions (global sequence)
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            "SELECT card_hash FROM transactions ORDER BY id DESC LIMIT 12"
        ).fetchall()

    streak = 0
    for r in rows:
        if r[0] == card_hash:
            streak += 1
        else:
            break
    return streak


def same_customer_email_signals(customer_email, customer_name):
    flags = []

    email_key = (customer_email or "").strip().lower()
    name_key = (customer_name or "").strip().lower()

    with sqlite3.connect(DB_PATH) as conn:
        existing = conn.execute(
            "SELECT name FROM customer_profiles WHERE email = ?",
            (email_key,),
        ).fetchone()
        if existing and existing[0] and existing[0].strip().lower() != name_key:
            flags.append("email_seen_with_different_name")

        same_name_other_email = conn.execute(
            "SELECT COUNT(*) FROM customer_profiles WHERE lower(name) = ? AND email != ?",
            (name_key, email_key),
        ).fetchone()
        if same_name_other_email and same_name_other_email[0] > 0:
            flags.append("name_seen_with_other_email")

    return flags


def parse_exempt_rules(raw_rules):
    if not isinstance(raw_rules, list):
        return set()
    normalized = {str(r).strip().lower() for r in raw_rules}
    return {r for r in normalized if r in RULE_KEYS}


def is_rule_enabled(exempt_rules, rule_key):
    return rule_key not in exempt_rules


def extract_email_domain(email):
    if not email or "@" not in email:
        return ""
    return email.split("@", 1)[1].strip().lower()


def is_unusual_email_domain(email):
    domain = extract_email_domain(email)
    if not domain:
        return True

    disposable_domains = {
        "mailinator.com",
        "10minutemail.com",
        "guerrillamail.com",
        "tempmail.com",
        "yopmail.com",
        "sharklasers.com",
    }
    suspicious_tlds = {".xyz", ".top", ".buzz", ".click", ".loan", ".work"}

    if domain in disposable_domains:
        return True
    return any(domain.endswith(tld) for tld in suspicious_tlds)


def email_velocity(customer_email):
    since = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT COUNT(*) FROM transactions WHERE customer_email = ? AND created_at >= ?",
            (str(customer_email or "").strip().lower(), since),
        ).fetchone()
    return int(row[0] if row else 0)


def email_card_count(customer_email):
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT COUNT(DISTINCT card_hash) FROM transactions WHERE customer_email = ?",
            (str(customer_email or "").strip().lower(),),
        ).fetchone()
    return int(row[0] if row else 0)


def has_recent_flagged_entity(customer_email, ip, device_id):
    status_set = ("declined", "flagged")
    since = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    with sqlite3.connect(DB_PATH) as conn:
        email_hit = conn.execute(
            """
            SELECT COUNT(*) FROM transactions
            WHERE customer_email = ?
              AND status IN (?, ?)
              AND created_at >= ?
            """,
            (str(customer_email or "").strip().lower(), status_set[0], status_set[1], since),
        ).fetchone()

        ip_hit = conn.execute(
            """
            SELECT COUNT(*) FROM transactions
            WHERE ip = ?
              AND status IN (?, ?)
              AND created_at >= ?
            """,
            (str(ip or "").strip(), status_set[0], status_set[1], since),
        ).fetchone()

        mac_hit = conn.execute(
            """
            SELECT COUNT(*) FROM transactions
            WHERE device_id = ?
              AND status IN (?, ?)
              AND created_at >= ?
            """,
            (str(device_id or "").strip(), status_set[0], status_set[1], since),
        ).fetchone()

    return {
        "email": int(email_hit[0] if email_hit else 0) > 0,
        "ip": int(ip_hit[0] if ip_hit else 0) > 0,
        "device": int(mac_hit[0] if mac_hit else 0) > 0,
    }


def velocity_for_card(card_hash):
    since = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT COUNT(*) FROM transactions WHERE card_hash = ? AND created_at >= ?",
            (card_hash, since),
        ).fetchone()
    return int(row[0] if row else 0)


def save_backend_records(data):
    now = datetime.now(timezone.utc).isoformat()

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO cards (card_hash, last4, bin6, first_seen, last_seen, total_uses)
            VALUES (?, ?, ?, ?, ?, 1)
            ON CONFLICT(card_hash) DO UPDATE SET
                last_seen=excluded.last_seen,
                total_uses=cards.total_uses + 1
            """,
            (data["card_hash"], data["card_last4"], data["card_bin6"], now, now),
        )

        conn.execute(
            """
            INSERT INTO transactions (
                created_at, card_hash, customer_email, customer_name,
                amount, ip, is_proxy, is_vpn, is_hosting, device_id,
                ml_confidence, risk_score, status, reasons
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                now,
                data["card_hash"],
                data["customer_email"],
                data["customer_name"],
                data["amount"],
                data["ip"],
                int(data["is_proxy"]),
                int(data["is_vpn"]),
                int(data["is_hosting"]),
                data["device_id"],
                data["ml_confidence"],
                data["risk_score"],
                data["status"],
                json.dumps(data["reasons"]),
            ),
        )

        conn.execute(
            """
            INSERT INTO customer_profiles (email, name, first_seen, last_seen, total_transactions)
            VALUES (?, ?, ?, ?, 1)
            ON CONFLICT(email) DO UPDATE SET
                name=excluded.name,
                last_seen=excluded.last_seen,
                total_transactions=customer_profiles.total_transactions + 1
            """,
            (
                data["customer_email"],
                data["customer_name"],
                now,
                now,
            ),
        )


init_db()


@app.route("/predict", methods=["POST"])
def predict():
    payload = request.json

    # ---- Validate input ----
    required_fields = [
        "amt", "category", "gender", "dob", "city_pop",
        "lat", "long", "merch_lat", "merch_long", "trans_date_trans_time"
    ]

    missing = [f for f in required_fields if f not in payload]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    prob = ml_confidence_from_payload(payload)

    return jsonify({
        "fraud": bool(prob > 0.4),
        "confidence": float(prob)
    })


@app.route("/assess-transaction", methods=["POST"])
def assess_transaction():
    payload = request.json or {}

    required_fields = [
        "amount", "category", "gender", "dob",
        "billingAddress", "shippingAddress",
        "cardNumber", "name", "email"
    ]
    missing = [f for f in required_fields if f not in payload or payload.get(f) in (None, "")]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    ip = get_client_ip(request)
    network = lookup_ip_risk(ip)
    exempt_rules = parse_exempt_rules(payload.get("exemptRules"))

    card_hash, card_last4, card_bin6 = card_fingerprint(payload.get("cardNumber"))
    if not card_hash:
        return jsonify({"error": "Invalid card number"}), 400

    city = city_from_address(payload.get("billingAddress", ""))
    city_pop = payload.get("city_pop")
    if city_pop in (None, ""):
        city_pop = lookup_city_population(city)

    ml_payload = {
        "amt": float(payload.get("amount", 0)),
        "category": payload.get("category", "grocery_pos"),
        "gender": payload.get("gender", "F") if payload.get("gender") in {"M", "F"} else "F",
        "dob": payload.get("dob"),
        "city_pop": float(city_pop),
        "lat": float(payload.get("lat", 40.7128)),
        "long": float(payload.get("long", -74.0060)),
        "merch_lat": float(payload.get("merch_lat", 40.7580)),
        "merch_long": float(payload.get("merch_long", -73.9855)),
        "trans_date_trans_time": payload.get("trans_date_trans_time") or datetime.now(timezone.utc).isoformat(),
    }

    ml_confidence = ml_confidence_from_payload(ml_payload)

    reasons = []
    heuristic_risk = 0.0

    streak = get_card_streak(card_hash)
    customer_email = str(payload.get("email", "")).strip().lower()
    customer_name = str(payload.get("name", "")).strip()
    device_id = payload.get("deviceId") or ""

    if is_rule_enabled(exempt_rules, RULE_MULTIPLE_CARDS):
        prior_cards_for_email = email_card_count(customer_email)
        if prior_cards_for_email >= 2:
            heuristic_risk += 0.18
            reasons.append(f"multiple_cards_for_email:{prior_cards_for_email}")

    if is_rule_enabled(exempt_rules, RULE_TX_FREQUENCY):
        if streak >= 3:
            heuristic_risk += 0.25
            reasons.append(f"consecutive_same_card_payments:{streak}")

        card_velocity = velocity_for_card(card_hash)
        email_vel = email_velocity(customer_email)
        if card_velocity >= 4:
            heuristic_risk += 0.20
            reasons.append(f"high_card_velocity_10m:{card_velocity}")
        if email_vel >= 5:
            heuristic_risk += 0.15
            reasons.append(f"high_email_velocity_10m:{email_vel}")
    else:
        card_velocity = velocity_for_card(card_hash)
        email_vel = email_velocity(customer_email)

    customer_flags = same_customer_email_signals(payload.get("email"), payload.get("name"))
    if customer_flags:
        heuristic_risk += 0.20
        reasons.extend(customer_flags)

    if is_rule_enabled(exempt_rules, RULE_BILLING_SHIPPING):
        if str(payload.get("billingAddress", "")).strip() != str(payload.get("shippingAddress", "")).strip():
            heuristic_risk += 0.10
            reasons.append("billing_shipping_mismatch")

    if is_rule_enabled(exempt_rules, RULE_VPN):
        if network["is_proxy"] or network["is_vpn"]:
            heuristic_risk += 0.25
            reasons.append("vpn_or_proxy_detected")

    if is_rule_enabled(exempt_rules, RULE_UNUSUAL_DOMAIN):
        if is_unusual_email_domain(customer_email):
            heuristic_risk += 0.15
            reasons.append("unusual_email_domain")

    if is_rule_enabled(exempt_rules, RULE_FLAGGED_ENTITY):
        flagged = has_recent_flagged_entity(customer_email, network["ip"], device_id)
        if flagged["email"] or flagged["ip"] or flagged["device"]:
            heuristic_risk += 0.30
            reasons.append("previously_flagged_entity_detected")

    if network["is_hosting"]:
        heuristic_risk += 0.10
        reasons.append("hosting_or_mobile_network_detected")

    if not reasons:
        reasons.append("no_rule_anomaly_detected")

    # ML is always part of final flagging score (no hardcoded-only decision)
    blended_risk = min(1.0, (0.72 * ml_confidence) + (0.28 * min(1.0, heuristic_risk)))

    if blended_risk >= 0.85:
        status = "declined"
    elif blended_risk >= 0.55:
        status = "review"
    else:
        status = "completed"

    save_backend_records({
        "card_hash": card_hash,
        "card_last4": card_last4,
        "card_bin6": card_bin6,
        "customer_email": customer_email,
        "customer_name": customer_name,
        "amount": ml_payload["amt"],
        "ip": network["ip"],
        "is_proxy": network["is_proxy"],
        "is_vpn": network["is_vpn"],
        "is_hosting": network["is_hosting"],
        "device_id": device_id,
        "ml_confidence": ml_confidence,
        "risk_score": blended_risk,
        "status": status,
        "reasons": reasons,
    })

    return jsonify({
        "status": status,
        "fraud": bool(ml_confidence > 0.4),
        "confidence": float(ml_confidence),
        "riskScore": float(blended_risk),
        "reasons": reasons,
        "network": {
            "ip": network["ip"],
            "vpnOrProxy": bool(network["is_vpn"] or network["is_proxy"]),
            "macAddress": "Not available in browser context",
        },
        "exemptRulesApplied": sorted(list(exempt_rules)),
        "activeRules": sorted(list(RULE_KEYS - exempt_rules)),
        "city": {
            "name": city,
            "population": int(city_pop),
            "source": "open-meteo-geocoding",
        },
        "card": {
            "last4": card_last4,
            "streak": streak,
            "velocity10m": card_velocity,
        },
        "emailVelocity10m": email_vel,
    })


if __name__ == "__main__":
    app.run(debug=True)
