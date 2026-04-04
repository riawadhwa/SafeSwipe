"""
Fraud detection service
Handles ML model loading and prediction logic
"""
import joblib
import json
import pandas as pd
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, List, Tuple
from backend.config.settings import (
    STACKING_MODEL_PATH,
    SCALER_PATH,
    FEATURES_JSON_PATH,
    FRAUD_THRESHOLD,
    CARD_VELOCITY_TIME_WINDOW,
    CARD_VELOCITY_MAX_TRANSACTIONS,
    CARD_VELOCITY_FRAUD_BOOST,
    VPN_FRAUD_BOOST,
    DUPLICATE_CUSTOMER_FRAUD_BOOST,
    DUPLICATE_CUSTOMER_THRESHOLD
)
from backend.services.feature_engineering import build_model_features


class FraudDetectionService:
    """Handles fraud detection predictions and rule-based checks"""
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self.model_features = []
        self.card_transactions = defaultdict(list)
        self._load_model_artifacts()
    
    def _load_model_artifacts(self):
        """Load ML model, scaler, and feature list"""
        try:
            self.model = joblib.load(str(STACKING_MODEL_PATH))
            self.scaler = joblib.load(str(SCALER_PATH))
            
            with open(str(FEATURES_JSON_PATH)) as f:
                self.model_features = json.load(f)
            
            print("✅ ML model artifacts loaded successfully")
        except Exception as e:
            print(f"❌ Error loading model artifacts: {e}")
            raise
    
    def check_card_velocity(self, card_number: str) -> bool:
        """
        Check if card has multiple transactions in short time
        
        Args:
            card_number: Credit card number
            
        Returns:
            True if velocity threshold exceeded, False otherwise
        """
        now = datetime.now()
        
        # Clean old transactions
        cutoff = now - timedelta(minutes=CARD_VELOCITY_TIME_WINDOW)
        self.card_transactions[card_number] = [
            t for t in self.card_transactions[card_number] if t > cutoff
        ]
        
        # Add current transaction
        self.card_transactions[card_number].append(now)
        
        # Check velocity
        recent_count = len(self.card_transactions[card_number])
        
        print(f"Card {card_number[-4:]} has {recent_count} transactions in last {CARD_VELOCITY_TIME_WINDOW} minutes")
        
        return recent_count > CARD_VELOCITY_MAX_TRANSACTIONS
    
    def predict_fraud(self, transaction_data: Dict) -> Dict:
        """
        Predict fraud probability for a transaction
        
        Args:
            transaction_data: Dictionary containing transaction details
            
        Returns:
            Dictionary with fraud prediction results
        """
        # Build DataFrame
        df = pd.DataFrame([{
            "amt": transaction_data["amt"],
            "category": transaction_data["category"],
            "gender": transaction_data["gender"],
            "dob": transaction_data["dob"],
            "city_pop": transaction_data["city_pop"],
            "lat": transaction_data["lat"],
            "long": transaction_data["long"],
            "merch_lat": transaction_data["merch_lat"],
            "merch_long": transaction_data["merch_long"],
            "trans_date_trans_time": transaction_data["trans_date_trans_time"]
        }])

        # Feature engineering
        X = build_model_features(df)

        # Enforce exact feature order from training
        X = X[self.model_features]

        # Scale features
        X_scaled = self.scaler.transform(X)

        # Predict
        prob = self.model.predict_proba(X_scaled)[0][1]
        
        return {
            "ml_score": float(prob),
            "features": X.to_dict('records')[0]
        }
    
    def apply_fraud_rules(self, ml_score: float, card_number: str, 
                         ip_country: str = None, is_vpn: bool = False,
                         duplicate_check: dict = None) -> Tuple[float, List[str]]:
        """
        Apply additional fraud detection rules
        
        Args:
            ml_score: Machine learning fraud score
            card_number: Credit card number
            ip_country: Country from IP geolocation
            is_vpn: Whether VPN/Proxy was detected
            duplicate_check: Results from duplicate customer check
            
        Returns:
            Tuple of (final_fraud_score, list_of_fraud_reasons)
        """
        fraud_score = ml_score
        fraud_reasons = []
        
        # Rule 1: Card velocity - consecutive transactions from same card
        if self.check_card_velocity(card_number):
            fraud_score = min(fraud_score + CARD_VELOCITY_FRAUD_BOOST, 1.0)
            fraud_reasons.append("High card velocity - multiple transactions in short time")
            print("⚠️ Flagged: Card velocity fraud detected")
        
        # Rule 2: VPN/Proxy detection - suspicious IP address
        if is_vpn:
            fraud_score = min(fraud_score + VPN_FRAUD_BOOST, 1.0)
            fraud_reasons.append("VPN/Proxy detected - suspicious network")
            print("⚠️ Flagged: VPN/Proxy usage detected")
        
        # Rule 3: IP location tracking
        if ip_country and ip_country.upper() != "UNKNOWN":
            fraud_reasons.append(f"IP Country: {ip_country}")
        
        # Rule 4: Duplicate customer check - same email with multiple cards
        if duplicate_check:
            if duplicate_check.get("email_exists") and duplicate_check.get("transaction_count", 0) >= DUPLICATE_CUSTOMER_THRESHOLD:
                fraud_score = min(fraud_score + DUPLICATE_CUSTOMER_FRAUD_BOOST, 1.0)
                fraud_reasons.append(f"Multiple cards from same email ({duplicate_check['transaction_count']} cards)")
                print(f"⚠️ Flagged: Customer has {duplicate_check['transaction_count']} cards registered")
            
            if duplicate_check.get("previous_cards"):
                fraud_reasons.append(f"Previous cards: {', '.join(['****' + c for c in duplicate_check['previous_cards']])}")
        
        return fraud_score, fraud_reasons
    
    def is_fraud(self, fraud_score: float) -> bool:
        """
        Determine if transaction is fraudulent based on threshold
        
        Args:
            fraud_score: Fraud score (0-1)
            
        Returns:
            True if fraud, False otherwise
        """
        return fraud_score > FRAUD_THRESHOLD


# Singleton instance
fraud_detection_service = FraudDetectionService()
