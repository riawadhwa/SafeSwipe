# Backend Documentation

## Directory Structure

```
backend/
├── api/                      # API endpoints and routes
│   ├── __init__.py
│   └── app.py               # Main Flask application
│
├── config/                   # Configuration management
│   ├── __init__.py
│   └── settings.py          # Application settings and environment vars
│
├── services/                 # Business logic layer
│   ├── __init__.py
│   ├── firebase_service.py         # Firebase/Firestore operations
│   ├── external_api_service.py     # External API integrations
│   ├── fraud_detection_service.py  # ML model and fraud detection
│   └── feature_engineering.py      # Feature transformation for ML
│
├── ml_models/               # Machine learning models
│   ├── features.json       # Feature list for model
│   ├── scaler.pkl         # Feature scaler
│   ├── xgboost.pkl        # XGBoost model
│   ├── random_forest.pkl  # Random Forest model
│   ├── logistic_regression.pkl  # Logistic Regression model
│   └── stacking_rf_xgb.pkl      # Stacking ensemble (Git LFS)
│
├── utils/                   # Utility functions
│   └── __init__.py
│
├── __init__.py             # Backend package init
├── __main__.py             # Package entry point
├── run.py                  # Server startup script
└── requirements.txt        # Python dependencies
```

## Running the Backend

### Method 1: Using run.py

```bash
cd backend
python run.py
```

### Method 2: As a module

```bash
python -m backend.api.app
```

### Method 3: Using Flask CLI

```bash
export FLASK_APP=backend.api.app:create_app
flask run
```

## Services

### FirebaseService

Handles all Firebase/Firestore operations:

- `save_credit_card()` - Store credit card information
- `save_transaction()` - Store transaction details

### ExternalAPIService

Manages external API integrations:

- `get_city_data()` - Fetch city population and coordinates
- `get_ip_geolocation()` - Get location from IP address

### FraudDetectionService

Core fraud detection logic:

- `predict_fraud()` - ML-based fraud prediction
- `check_card_velocity()` - Detect rapid successive transactions
- `apply_fraud_rules()` - Apply business rules on top of ML
- `is_fraud()` - Final fraud determination

## Configuration

All configuration is centralized in `config/settings.py`:

- File paths for ML models
- API keys (loaded from environment)
- Flask server settings
- Fraud detection thresholds

## Environment Variables

Required environment variables:

```
FLASK_DEBUG=True
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
IP_GEOLOCATION_API_KEY=your_key
CITY_POPULATION_API_KEY=your_key
FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json
```
