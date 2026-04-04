#!/bin/bash
# Setup script for FraudGuard project

set -e  # Exit on error

echo "🚀 Setting up FraudGuard Credit Fraud Detection System..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Python version
echo -e "\n${YELLOW}Checking Python version...${NC}"
python_version=$(python3 --version 2>&1 | grep -oP '\d+\.\d+' | head -1)
required_version="3.8"

if (( $(echo "$python_version < $required_version" | bc -l) )); then
    echo -e "${RED}Error: Python $required_version or higher is required${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python $python_version found${NC}"

# Check Node.js version
echo -e "\n${YELLOW}Checking Node.js version...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version) found${NC}"

# Backend setup
echo -e "\n${YELLOW}Setting up backend...${NC}"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install backend dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

echo -e "${GREEN}✓ Backend setup complete${NC}"

# Frontend setup
echo -e "\n${YELLOW}Setting up frontend...${NC}"
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

echo -e "${GREEN}✓ Frontend setup complete${NC}"
cd ..

# Environment setup
echo -e "\n${YELLOW}Setting up environment...${NC}"
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please update .env file with your API keys${NC}"
fi

# Check for Firebase credentials
if [ ! -f "serviceAccountKey.json" ]; then
    echo -e "${YELLOW}⚠️  Firebase credentials not found${NC}"
    echo -e "${YELLOW}   Please download serviceAccountKey.json from Firebase Console${NC}"
fi

# Create necessary directories
mkdir -p logs
mkdir -p data

echo -e "\n${GREEN}✅ Setup complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Update .env file with your API keys"
echo "2. Add serviceAccountKey.json from Firebase Console"
echo "3. Start the backend: python backend/run.py"
echo "4. Start the frontend: cd frontend && npm run dev"
echo -e "\n${GREEN}Happy coding! 🎉${NC}"
