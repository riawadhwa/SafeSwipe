#!/usr/bin/env python
"""
FraudGuard Backend Server
Start the Flask API server
"""
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir.parent))

from backend.api.app import create_app
from backend.config.settings import FLASK_DEBUG, FLASK_HOST, FLASK_PORT

if __name__ == "__main__":
    app = create_app()
    print(f"🚀 Starting FraudGuard API server on {FLASK_HOST}:{FLASK_PORT}")
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG)
