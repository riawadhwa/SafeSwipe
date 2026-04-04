# FraudGuard - Credit Card Fraud Detection System

A real-time credit card fraud detection system powered by machine learning, featuring a modern React frontend and Flask backend API.

## 🏗️ Project Structure

```
credit_fraud_detection/
├── backend/                    # Python Flask API
│   ├── api/                   # API routes and endpoints
│   │   └── app.py            # Main Flask application
│   ├── config/               # Configuration files
│   │   └── settings.py       # Application settings
│   ├── services/             # Business logic layer
│   │   ├── firebase_service.py           # Firebase/Firestore operations
│   │   ├── external_api_service.py       # External API integrations
│   │   ├── fraud_detection_service.py    # ML model and predictions
│   │   └── feature_engineering.py        # Feature transformation
│   ├── ml_models/            # Trained ML models
│   │   ├── stacking_rf_xgb.pkl  # (Git LFS)
│   │   ├── scaler.pkl
│   │   └── features.json
│   ├── utils/                # Utility functions
│   ├── requirements.txt      # Python dependencies
│   └── run.py               # Server entry point
│
├── frontend/                  # React application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service layer
│   │   ├── context/         # React context providers
│   │   └── lib/             # Utilities and Firebase config
│   ├── public/
│   └── package.json
│
├── docs/                     # Documentation
│   ├── FIREBASE_SETUP.md
│   └── INTEGRATION.md
│
├── model/                    # Legacy model directory (deprecated)
├── .env.example             # Environment variables template
└── README.md                # This file
```

## 🚀 Features

- **Real-time Fraud Detection**: Machine learning-based fraud scoring
- **Rule-based Validation**: Card velocity checks and geolocation analysis
- **Firebase Integration**: Secure data storage and authentication
- **IP Geolocation**: Track transaction locations
- **City Data Enrichment**: Population and geographic data
- **Modern Dashboard**: React-based admin interface
- **RESTful API**: Clean Flask API architecture

## 🛠️ Tech Stack

### Backend

- **Framework**: Flask 2.2+
- **ML/Data**: scikit-learn, XGBoost, pandas, numpy
- **Database**: Firebase Firestore
- **APIs**: IP Geolocation, City Population API

### Frontend

- **Framework**: React 18 with Vite
- **UI**: Tailwind CSS, shadcn/ui
- **State Management**: React Context
- **Routing**: React Router

## 📦 Installation

### Prerequisites

- Python 3.8+
- Node.js 16+
- Firebase account (for Firestore)

### Backend Setup

1. Navigate to backend directory:

```bash
cd backend
```

2. Create virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Set up environment variables:

```bash
cp ../.env.example .env
# Edit .env with your API keys
```

5. Add Firebase credentials:
   - Download `serviceAccountKey.json` from Firebase Console
   - Place it in the project root directory

6. Start the server:

```bash
python run.py
# or
python -m backend.api.app
```

The API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Configure Firebase:
   - Update `src/lib/firebase.js` with your Firebase config

4. Start the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 🔑 API Endpoints

### Health Check

```bash
GET /health
```

### Fraud Prediction

```bash
POST /predict
Content-Type: application/json

{
  "amt": 50.00,
  "category": "grocery",
  "gender": "M",
  "dob": "1990-01-01",
  "city_name": "Mumbai",
  "lat": 19.0760,
  "long": 72.8777,
  "merch_lat": 19.0896,
  "merch_long": 72.8656,
  "trans_date_trans_time": "2024-01-15T14:30:00",
  "card_number": "1234567890123456",
  "customer_email": "user@example.com",
  "customer_name": "John Doe",
  "ip_address": "1.2.3.4"
}
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 📊 ML Model

The fraud detection system uses a **stacking ensemble model** combining:

- Random Forest
- XGBoost
- Logistic Regression

### Features Used:

- Transaction amount (normalized)
- Category
- Temporal features (hour, month, weekend, etc.)
- Geographic distance
- Demographics (age, gender)
- City population
- Custom fraud rules (card velocity, IP location)

## 🔒 Security Notes

⚠️ **Important**: This is a development version. For production:

- Encrypt card numbers before storing
- Use environment variables for all secrets
- Implement proper authentication/authorization
- Enable HTTPS
- Add rate limiting
- Sanitize all inputs
- Use secure session management

## 📝 Environment Variables

Create a `.env` file based on `.env.example`:

```env
FLASK_DEBUG=False
FLASK_HOST=0.0.0.0
FLASK_PORT=5000

IP_GEOLOCATION_API_KEY=your_key_here
CITY_POPULATION_API_KEY=your_key_here

FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json

FRAUD_THRESHOLD=0.4
```

## 🚦 Development Workflow

1. **Backend Development**:
   - Add new services in `backend/services/`
   - Add new routes in `backend/api/`
   - Update config in `backend/config/settings.py`

2. **Frontend Development**:
   - Add components in `frontend/src/components/`
   - Add pages in `frontend/src/pages/`
   - Add API calls in `frontend/src/services/`

3. **Testing**:
   - Test API endpoints with Postman or curl
   - Test frontend in browser with React DevTools

## 📖 Documentation

See the `docs/` directory for:

- [Firebase Setup Guide](docs/FIREBASE_SETUP.md)
- [API Integration Guide](docs/INTEGRATION.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 👥 Author

Built with ❤️ for fraud prevention

## 🐛 Known Issues

- Model file `stacking_rf_xgb.pkl` requires Git LFS
- API keys should be managed with a secret manager in production
- Card numbers are not encrypted (development only)

## 🔮 Future Enhancements

- [ ] Add user authentication
- [ ] Real-time transaction monitoring dashboard
- [ ] Email/SMS alerts for fraud detection
- [ ] Model retraining pipeline
- [ ] A/B testing framework
- [ ] Comprehensive logging and monitoring
- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] API documentation with Swagger

---

For questions or issues, please open a GitHub issue.
