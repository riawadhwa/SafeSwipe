"""
FraudGuard Flask API
Main application entry point
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

from backend.config.settings import FLASK_DEBUG, FLASK_HOST, FLASK_PORT
from backend.services.firebase_service import firebase_service
from backend.services.external_api_service import external_api_service
from backend.services.fraud_detection_service import fraud_detection_service


def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    CORS(app)  # Enable CORS for frontend requests
    
    @app.route("/health", methods=["GET"])
    def health_check():
        """Health check endpoint"""
        return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})
    
    @app.route("/predict", methods=["POST"])
    def predict():
        """Fraud prediction endpoint"""
        payload = request.json

        # Validate input
        required_fields = [
            "amt", "category", "gender", "dob", "city_name",
            "lat", "long", "merch_lat", "merch_long", "trans_date_trans_time",
            "card_number", "customer_email", "customer_name"
        ]

        missing = [f for f in required_fields if f not in payload]
        if missing:
            return jsonify({"error": f"Missing fields: {missing}"}), 400

        # Extract fields
        card_number = payload.get("card_number", "")
        customer_email = payload.get("customer_email", "")
        customer_name = payload.get("customer_name", "")
        city_name = payload.get("city_name", "")
        ip_address = payload.get("ip_address")
        
        # Check for duplicate customer/email
        duplicate_check = firebase_service.check_duplicate_customer(customer_email, customer_name)
        print(f"Duplicate check: {duplicate_check}")
        
        # Save credit card to database
        card_last_4 = firebase_service.save_credit_card(card_number, customer_email, customer_name)
        
        # Get IP geolocation with VPN/Proxy detection
        ip_geo = external_api_service.get_ip_geolocation(ip_address)
        ip_latitude = ip_geo["latitude"] if ip_geo else payload.get("lat", 0)
        ip_longitude = ip_geo["longitude"] if ip_geo else payload.get("long", 0)
        ip_city = ip_geo["city"] if ip_geo else "Unknown"
        ip_country = ip_geo["country"] if ip_geo else "Unknown"
        is_vpn = ip_geo.get("is_vpn", False) if ip_geo else False
        isp_name = ip_geo.get("isp", "Unknown") if ip_geo else "Unknown"
        print(f"IP Location: {ip_city}, {ip_country} | Lat: {ip_latitude}, Long: {ip_longitude}")
        if is_vpn:
            print(f"⚠️ VPN/Proxy detected! ISP: {isp_name}")
        
        # Fetch city data from API
        lookup_city = ip_city if ip_city != "Unknown" else city_name
        city_data = external_api_service.get_city_data(lookup_city)
        city_pop = city_data["population"]
        city_latitude = city_data["latitude"]
        city_longitude = city_data["longitude"]
        print(f"City data for {lookup_city}: Population={city_pop}, Lat={city_latitude}, Long={city_longitude}")
        
        # Prepare transaction data for prediction
        transaction_data = {
            "amt": payload["amt"],
            "category": payload["category"],
            "gender": payload["gender"],
            "dob": payload["dob"],
            "city_pop": city_pop,
            "lat": city_latitude,
            "long": city_longitude,
            "merch_lat": payload["merch_lat"],
            "merch_long": payload["merch_long"],
            "trans_date_trans_time": payload["trans_date_trans_time"]
        }

        # Get ML prediction
        prediction = fraud_detection_service.predict_fraud(transaction_data)
        ml_score = prediction["ml_score"]
        
        # Apply fraud rules with all checks: velocity, VPN, duplicates
        final_score, fraud_reasons = fraud_detection_service.apply_fraud_rules(
            ml_score, card_number, ip_country, is_vpn, duplicate_check
        )
        
        # Determine if fraud
        is_fraud = fraud_detection_service.is_fraud(final_score)

        # Build response
        response = {
            "fraud": is_fraud,
            "confidence": final_score,
            "original_score": ml_score,
            "card_last_4": card_last_4,
            "ip_location": f"{ip_city}, {ip_country}" if ip_geo else "Unknown",
            "ip_latitude": float(ip_latitude),
            "ip_longitude": float(ip_longitude),
            "isp": isp_name,
            "vpn_detected": is_vpn,
            "city_population": city_pop,
            "city_name": lookup_city,
            "city_latitude": float(city_latitude),
            "city_longitude": float(city_longitude),
            "card_velocity_flag": any("velocity" in reason.lower() for reason in fraud_reasons),
            "duplicate_customer": duplicate_check.get("email_exists", False),
            "previous_card_count": duplicate_check.get("transaction_count", 0),
            "fraud_reason": fraud_reasons
        }

        return jsonify(response)
    
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG)
