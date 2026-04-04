@echo off
REM Setup script for FraudGuard project (Windows)

echo Setting up FraudGuard Credit Fraud Detection System...

REM Check Python version
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed
    exit /b 1
)

echo Python found

REM Check Node.js version
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed
    exit /b 1
)

echo Node.js found

REM Backend setup
echo.
echo Setting up backend...

REM Create virtual environment
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install backend dependencies
echo Installing Python dependencies...
pip install --upgrade pip
pip install -r backend\requirements.txt

echo Backend setup complete

REM Frontend setup
echo.
echo Setting up frontend...
cd frontend

if not exist "node_modules" (
    echo Installing Node.js dependencies...
    npm install
)

echo Frontend setup complete
cd ..

REM Environment setup
echo.
echo Setting up environment...
if not exist ".env" (
    echo Creating .env file from template...
    copy .env.example .env
    echo Please update .env file with your API keys
)

REM Check for Firebase credentials
if not exist "serviceAccountKey.json" (
    echo Firebase credentials not found
    echo Please download serviceAccountKey.json from Firebase Console
)

REM Create necessary directories
if not exist "logs" mkdir logs
if not exist "data" mkdir data

echo.
echo Setup complete!
echo.
echo Next steps:
echo 1. Update .env file with your API keys
echo 2. Add serviceAccountKey.json from Firebase Console
echo 3. Start the backend: python backend\run.py
echo 4. Start the frontend: cd frontend ^&^& npm run dev
echo.
echo Happy coding!

pause
