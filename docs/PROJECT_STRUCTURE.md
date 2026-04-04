# Project Structure Documentation

## Overview

This document explains the restructured codebase organization for the FraudGuard fraud detection system.

## Root Directory

```
credit_fraud_detection/
├── backend/              # Python Flask API (NEW)
├── frontend/             # React application (RENAMED from fraudguard-frontend)
├── docs/                 # Documentation files (NEW)
├── api/                  # Legacy API (DEPRECATED - kept for compatibility)
├── model/                # Legacy models (DEPRECATED - models moved to backend/ml_models)
├── .env.example         # Environment variables template
├── .gitignore           # Git ignore rules
├── README.md            # Main project documentation
├── requirements.txt     # Root-level requirements (legacy)
├── setup.sh             # Unix/Mac setup script
└── setup.bat            # Windows setup script
```

## Backend Structure

The backend is now properly structured following Python best practices:

```
backend/
├── api/                 # API layer
│   ├── app.py          # Flask application factory
│   └── routes/         # API route modules (future expansion)
│
├── config/             # Configuration management
│   └── settings.py     # Centralized settings and environment vars
│
├── services/           # Business logic layer
│   ├── firebase_service.py         # Firebase/Firestore operations
│   ├── external_api_service.py     # External API integrations
│   ├── fraud_detection_service.py  # ML model and fraud detection
│   └── feature_engineering.py      # Feature transformation
│
├── ml_models/          # Machine learning artifacts
│   ├── features.json
│   ├── scaler.pkl
│   └── *.pkl files
│
├── utils/              # Utility functions
├── run.py             # Server entry point
└── requirements.txt   # Backend-specific dependencies
```

### Design Patterns Used

1. **Service Layer Pattern**: Business logic separated into service classes
2. **Singleton Pattern**: Services instantiated as singletons
3. **Factory Pattern**: Flask app created via `create_app()` factory
4. **Configuration Pattern**: Centralized config in `settings.py`

## Frontend Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page-level components
│   ├── services/      # API service layer
│   ├── context/       # React Context providers
│   └── lib/           # Utilities and configurations
│
├── public/            # Static assets
└── package.json       # Node.js dependencies
```

## Migration from Old Structure

### What Changed

1. **API files moved**: `api/app.py` → `backend/api/app.py`
2. **Feature engineering**: `api/feature_engineering.py` → `backend/services/feature_engineering.py`
3. **Models relocated**: `model/` → `backend/ml_models/`
4. **Frontend renamed**: `fraudguard-frontend/` → `frontend/`
5. **Docs centralized**: Root-level `.md` files → `docs/`

### Backward Compatibility

The old `api/` directory now contains compatibility shims:

- `api/app.py` - Redirects to new backend
- `api/feature_engineering.py` - Re-exports from new location

These will be removed in a future release.

## Key Improvements

1. ✅ **Separation of Concerns**: Clear distinction between API, services, and config
2. ✅ **Scalability**: Easier to add new features and services
3. ✅ **Testability**: Services can be tested independently
4. ✅ **Maintainability**: Logical organization reduces cognitive load
5. ✅ **Documentation**: README files at each level
6. ✅ **Configuration**: Centralized settings management
7. ✅ **DRY Principle**: No code duplication

## Running the Application

### Quick Start

```bash
# Setup (first time only)
./setup.sh  # or setup.bat on Windows

# Start backend
python backend/run.py

# Start frontend (in new terminal)
cd frontend
npm run dev
```

### Development Workflow

1. Backend development: Work in `backend/` directory
2. Frontend development: Work in `frontend/` directory
3. API contracts: Document in `docs/`
4. Configuration: Update `backend/config/settings.py`

## Next Steps for Further Improvement

1. **Testing**: Add `backend/tests/` and `frontend/src/__tests__/`
2. **Logging**: Implement structured logging
3. **Monitoring**: Add health checks and metrics
4. **Docker**: Containerize both backend and frontend
5. **CI/CD**: Add GitHub Actions or similar
6. **API Versioning**: Implement `/api/v1/` routes
7. **Database Models**: Add proper ORM (SQLAlchemy) if needed
8. **API Documentation**: Add Swagger/OpenAPI specs

## File Count Summary

- **Backend**: ~15 Python files
- **Frontend**: ~30 JavaScript/JSX files
- **Documentation**: ~5 Markdown files
- **Configuration**: ~5 config files

## Standards and Conventions

### Python (Backend)

- PEP 8 style guide
- Type hints where applicable
- Docstrings for all functions/classes
- Service classes for business logic
- Environment variables for configuration

### JavaScript (Frontend)

- ESLint configuration
- Component-based architecture
- Service layer for API calls
- Context for state management
- Tailwind CSS for styling

## Questions or Issues?

See the main [README.md](../README.md) for detailed setup instructions and troubleshooting.
