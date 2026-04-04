"""
Firebase service for Firestore operations
"""
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
from backend.config.settings import FIREBASE_CREDENTIALS_PATH


class FirebaseService:
    """Handles all Firebase/Firestore operations"""
    
    def __init__(self):
        self.db = None
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        try:
            if not firebase_admin._apps:
                cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
                firebase_admin.initialize_app(cred)
            self.db = firestore.client()
            print("✅ Firebase initialized successfully")
        except Exception as e:
            print(f"⚠️ Firebase initialization failed: {e}")
            self.db = None
    
    def save_credit_card(self, card_number: str, customer_email: str, customer_name: str) -> str:
        """
        Store credit card details in Firestore
        
        Args:
            card_number: Full card number (should be encrypted in production)
            customer_email: Customer's email address
            customer_name: Customer's full name
            
        Returns:
            Last 4 digits of the card
        """
        card_last_4 = card_number[-4:]
        
        try:
            if self.db is None:
                print("⚠️ Firebase not initialized, card not saved")
                return card_last_4
            
            card_doc = {
                "card_number": card_number,  # TODO: Encrypt this in production
                "card_last_4": card_last_4,
                "customer_email": customer_email,
                "customer_name": customer_name,
                "saved_at": datetime.now().isoformat(),
                "is_active": True
            }
            
            # Use composite key: email_cardlast4
            card_id = f"{customer_email}_{card_last_4}"
            
            self.db.collection("credit_cards").document(card_id).set(card_doc, merge=True)
            
            print(f"✅ Credit card saved to Firebase for {customer_email}: ****{card_last_4}")
            return card_last_4
            
        except Exception as e:
            print(f"❌ Error saving card to Firebase: {e}")
            return card_last_4
    
    def save_transaction(self, transaction_data: dict) -> bool:
        """
        Save transaction details to Firestore
        
        Args:
            transaction_data: Dictionary containing transaction details
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if self.db is None:
                print("⚠️ Firebase not initialized, transaction not saved")
                return False
            
            self.db.collection("transactions").add(transaction_data)
            print("✅ Transaction saved to Firebase")
            return True
            
        except Exception as e:
            print(f"❌ Error saving transaction to Firebase: {e}")
            return False
    
    def check_duplicate_customer(self, customer_email: str, customer_name: str) -> dict:
        """
        Check if customer with same email or name exists
        
        Args:
            customer_email: Customer's email address
            customer_name: Customer's full name
            
        Returns:
            Dictionary with duplicate flags and transaction count
        """
        result = {
            "email_exists": False,
            "name_exists": False,
            "transaction_count": 0,
            "previous_cards": []
        }
        
        try:
            if self.db is None:
                print("⚠️ Firebase not initialized, duplicate check skipped")
                return result
            
            # Check for duplicate email
            email_cards = self.db.collection("credit_cards").where(
                "customer_email", "==", customer_email
            ).limit(10).stream()
            
            cards_list = list(email_cards)
            if cards_list:
                result["email_exists"] = True
                result["transaction_count"] = len(cards_list)
                result["previous_cards"] = [doc.to_dict().get("card_last_4") for doc in cards_list]
                print(f"⚠️ Customer email '{customer_email}' already has {len(cards_list)} card(s)")
            
            # Check for duplicate name (be cautious with name matching)
            name_cards = self.db.collection("credit_cards").where(
                "customer_name", "==", customer_name
            ).limit(5).stream()
            
            if list(name_cards):
                result["name_exists"] = True
                print(f"⚠️ Customer name '{customer_name}' found in database")
            
        except Exception as e:
            print(f"❌ Error checking duplicate customer: {e}")
        
        return result


# Singleton instance
firebase_service = FirebaseService()
