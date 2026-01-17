from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# ---------------- Load artifacts ----------------
model = joblib.load("model/xgboost.pkl")
scaler = joblib.load("model/scaler.pkl")

with open("model/features.json") as f:
    MODEL_FEATURES = json.load(f)

# ---------------- Feature builder ----------------
from feature_engineering import build_model_features   # SAME FUNCTION USED IN TRAINING


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

    # ---- Build raw dataframe ----
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
        "trans_date_trans_time": payload["trans_date_trans_time"]
    }])

    # ---- Feature engineering ----
    X = build_model_features(df)

    # ---- Enforce exact feature order from training ----
    X = X[MODEL_FEATURES]

    # ---- Scale exactly what scaler was trained on ----
    X_scaled = scaler.transform(X)

    # ---- Predict ----
    prob = model.predict_proba(X_scaled)[0][1]



    return jsonify({
        "fraud": bool(prob > 1e-05),
        "confidence": float(prob)
    })


if __name__ == "__main__":
    app.run(debug=True)
