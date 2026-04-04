"""
Configuration settings for FraudGuard backend
"""
import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# ML Model paths
ML_MODELS_DIR = BASE_DIR / "ml_models"
STACKING_MODEL_PATH = ML_MODELS_DIR / "stacking_rf_xgb.pkl"
SCALER_PATH = ML_MODELS_DIR / "scaler.pkl"
FEATURES_JSON_PATH = ML_MODELS_DIR / "features.json"

# API Keys (should be loaded from environment variables)
IP_GEOLOCATION_API_KEY = os.getenv("IP_GEOLOCATION_API_KEY", "eb2f613854994748a3b0f22c9d2093ec")
CITY_POPULATION_API_KEY = os.getenv("CITY_POPULATION_API_KEY", "YsgPBvTUa2ddaBeeL0QKAt3t32D7caZBOBpAxIHo")

# Firebase
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")

# API Settings
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "True").lower() == "true"
FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))

# Fraud detection thresholds
FRAUD_THRESHOLD = 0.4
CARD_VELOCITY_TIME_WINDOW = 10  # minutes
CARD_VELOCITY_MAX_TRANSACTIONS = 2
CARD_VELOCITY_FRAUD_BOOST = 0.3

# VPN/Proxy detection
VPN_FRAUD_BOOST = 0.25

# Duplicate customer detection
DUPLICATE_CUSTOMER_FRAUD_BOOST = 0.15
DUPLICATE_CUSTOMER_THRESHOLD = 3  # Number of cards before flagging
