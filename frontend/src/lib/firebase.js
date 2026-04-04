import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// ✅ Your Firebase config (CORRECT)
const firebaseConfig = {
  apiKey: "AIzaSyDD0u5qCCor8o_HEEaWkxwhkRFxsKm_ff0",
  authDomain: "fraudguard-70337.firebaseapp.com",
  projectId: "fraudguard-70337",
  storageBucket: "fraudguard-70337.appspot.com",
  messagingSenderId: "73434847152",
  appId: "1:73434847152:web:154badc5f2cf3b8927e875",
}

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig)

// ✅ Export services YOU ACTUALLY USE
export const auth = getAuth(app)
export const db = getFirestore(app)
