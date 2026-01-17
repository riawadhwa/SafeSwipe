import { db } from "@/lib/firebase"
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore"

export const createPaymentLink = async (data) => {
  try {
    const docRef = await addDoc(collection(db, "payment_links"), {
      ...data,
      createdAt: serverTimestamp(),
      status: "active",
    })
    console.log("Payment link created with ID:", docRef.id)
    return docRef
  } catch (error) {
    console.error("Error creating payment link:", error)
    throw error
  }
}

export const getPaymentLinks = async () => {
  try {
    const q = query(
      collection(db, "payment_links"),
      orderBy("createdAt", "desc")
    )

    const snapshot = await getDocs(q)
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    console.log("Fetched payment links:", data)
    return data
  } catch (error) {
    console.error("Error fetching payment links:", error)
    throw error
  }
}
