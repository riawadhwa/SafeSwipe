# SafeSwipe ML Integration Guide

## Overview

Your SafeSwipe payment system now integrates with a fraud detection ML model that analyzes transactions in real-time.

## Architecture

```
Frontend (React/Vite) → Flask API → ML Model (XGBoost) → Prediction
                     ↓
                 Firestore (Save Result)
```

## Setup Steps

### 1. Install Python Dependencies

```bash
cd ~/Desktop/credit_fraud_detection
pip install -r requirements.txt
```

### 2. Start the Flask API

```bash
python api/app.py
```

The API will run at `http://localhost:5000`

### 3. Start the Frontend

In a new terminal:

```bash
cd fraudguard-frontend
npm run dev
```

## How It Works

### Payment Flow

1. User fills payment form on `/pay/:linkCode`
2. Frontend calls `/predict` API endpoint with transaction data
3. ML model analyzes 20+ features (time, location, amount, demographics)
4. Returns fraud probability score
5. Transaction is:
   - **Completed** if fraud score is low
   - **Under Review** if fraud score is moderate
   - **Declined** if fraud score is high

### API Request Format

```json
{
  "amt": 100,
  "category": "gas_transport",
  "gender": "M",
  "dob": "1990-01-01",
  "city_pop": 50000,
  "lat": 40.7128,
  "long": -74.006,
  "merch_lat": 40.758,
  "merch_long": -73.9855,
  "trans_date_trans_time": "2026-01-05T10:30:00Z"
}
```

### API Response

```json
{
  "fraud": false,
  "confidence": 0.00234
}
```

## Next Steps to Enhance

### 1. Collect More User Data

Update the payment form to capture:

- Date of birth (for age calculation)
- Gender
- Billing city/location (for city_pop and lat/long)

### 2. Add Transaction Categories

Map payment links to merchant categories:

- gas_transport
- grocery_pos
- shopping_net
- entertainment
- etc.

### 3. Implement Geolocation

Use browser geolocation API to get user's coordinates:

```javascript
navigator.geolocation.getCurrentPosition((pos) => {
  const { latitude, longitude } = pos.coords;
  // Use in API call
});
```

### 4. Store ML Results

Currently storing status in Firestore. Also store:

- `fraudScore` (the confidence value)
- `mlModelVersion` (for tracking)
- `features` (the input features used)

### 5. Add Thresholds Configuration

Make the decision logic configurable:

```javascript
const THRESHOLDS = {
  decline: 0.5, // > 50% confidence = decline
  review: 0.1, // 10-50% = review
  // < 10% = approve
};
```

## Testing

### Test with Mock Data

The current integration uses placeholder values. To test properly:

1. Use the console to see the OTP code for signup
2. Create a payment link
3. Fill the payment form
4. Check the backend console for ML predictions
5. Verify transaction status in dashboard

### Expected Behavior

- Most normal transactions → Completed
- Suspicious patterns (high amount, odd time, distant location) → Review/Declined

## Files Modified

- `fraudguard-frontend/src/pages/PaymentPage.jsx` - Calls ML API
- `api/app.py` - Added CORS support

## Troubleshooting

### Frontend can't reach API

- Ensure Flask is running on port 5000
- Check browser console for CORS errors
- Verify `http://localhost:5000/predict` is accessible

### Model not found errors

- Ensure you're in the project root when running `python api/app.py`
- Check that `model/` folder contains .pkl files

### Predictions always the same

- The model needs realistic input data
- Update hardcoded values (lat, long, dob, etc.) with real user data
