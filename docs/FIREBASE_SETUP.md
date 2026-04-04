# Firebase Credit Card Storage Setup

## Overview

Credit cards are now stored in Firebase Firestore instead of in-memory storage. This provides:

- ✅ Persistent storage across server restarts
- ✅ Secure cloud storage
- ✅ Easy retrieval and management
- ⚠️ Still requires encryption in production (see below)

## Setup Steps

### 1. Install Firebase Admin SDK

```bash
pip install firebase-admin
```

Or update your environment:

```bash
cd ~/Desktop/credit_fraud_detection
pip install -r requirements.txt
```

### 2. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **fraudguard-70337**
3. Click **⚙️ Project Settings** (top-left gear icon)
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. A JSON file will download (e.g., `fraudguard-70337-xxxxx.json`)

### 3. Add Service Account Key to Project

Place the downloaded file in your project root:

```bash
mv ~/Downloads/fraudguard-70337-xxxxx.json ~/Desktop/credit_fraud_detection/serviceAccountKey.json
```

### 4. Set Environment Variable (Optional)

If your key file is in a different location, set the environment variable:

```bash
export FIREBASE_CREDENTIALS_PATH="/path/to/serviceAccountKey.json"
```

Or on Windows:

```cmd
set FIREBASE_CREDENTIALS_PATH=C:\path\to\serviceAccountKey.json
```

### 5. Update Firestore Security Rules

Go to **Firestore Database** → **Rules** tab and update:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Allow backend to write credit cards
    match /credit_cards/{document=**} {
      allow read, write: if request.auth.uid != null || request.headers.origin == 'http://localhost:5000';
    }

    // Allow existing rules for transactions, customers, etc.
    match /transactions/{document=**} {
      allow read, write: if true;
    }
    match /customers/{document=**} {
      allow read, write: if true;
    }
    match /payment_links/{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 6. Start Flask API

```bash
cd ~/Desktop/credit_fraud_detection
python api/app.py
```

You should see:

```
✅ Firebase initialized successfully
```

## Firebase Collection Structure

### Credit Cards Collection

**Collection:** `credit_cards`

**Document ID Format:** `{email}_{last_4_digits}`

**Example Document:**

```json
{
  "credit_cards/john@email.com_4242": {
    "card_number": "4242424242424242",
    "card_last_4": "4242",
    "customer_email": "john@email.com",
    "customer_name": "John Smith",
    "saved_at": "2026-02-07T14:30:00",
    "is_active": true
  }
}
```

## Data Flow

```
Payment Form
    ↓
Backend: save_credit_card()
    ↓
Firebase Admin SDK
    ↓
Firestore Collection: credit_cards
    ↓
Document: john@email.com_4242 {
    card_number: "4242...",
    card_last_4: "4242",
    saved_at: timestamp,
    ...
}
```

## Verify Storage

### Option 1: Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com)
2. Select **fraudguard-70337** project
3. Click **Firestore Database**
4. Check **credit_cards** collection
5. You should see documents with card data

### Option 2: Python Script

```python
import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Retrieve all saved cards
cards = db.collection("credit_cards").stream()
for card in cards:
    print(card.to_dict())
```

## Security Considerations

### ⚠️ CURRENT STATE (Development)

- ✓ Cards stored in Firestore (persistent)
- ✗ Cards stored as plain text
- ✗ No encryption in transit
- ✗ Accessible from backend

### ✅ PRODUCTION RECOMMENDATIONS

1. **Encrypt Card Numbers**

```python
from cryptography.fernet import Fernet

# Generate key (store securely)
cipher = Fernet(encryption_key)
encrypted_card = cipher.encrypt(card_number.encode())
```

2. **Use Firestore Encryption**

- Enable Application-layer Secrets Encryption (ALSE)
- Use Google Cloud KMS for key management

3. **Tokenization Service**

- Use Stripe, Square, or Adyen
- Store only tokens, not card numbers

4. **PCI DSS Compliance**

- Implement proper access controls
- Enable audit logging
- Use HTTPS/TLS for all connections

## Troubleshooting

### Firebase Not Initialized

```
⚠️ Firebase not initialized, card not saved
```

**Solution:** Verify `serviceAccountKey.json` exists and is valid

### Permission Denied

```
❌ Error saving card to Firebase: PERMISSION_DENIED
```

**Solution:** Update Firestore security rules (see Step 5)

### Module Not Found

```
ModuleNotFoundError: No module named 'firebase_admin'
```

**Solution:** Install firebase-admin:

```bash
pip install firebase-admin
```

## API Response with Card Storage

When a payment is made, the backend will:

1. Save card to Firestore with timestamp
2. Return card last 4 digits
3. Mark payment as completed/declined

```json
{
  "fraud": false,
  "confidence": 0.25,
  "card_last_4": "4242",
  "ip_location": "New York, United States",
  ...
}
```

## Next Steps

- [ ] Set up encryption for card storage
- [ ] Implement card retrieval for saved cards
- [ ] Add PCI DSS compliance checks
- [ ] Set up audit logging
- [ ] Move to tokenization service for production
