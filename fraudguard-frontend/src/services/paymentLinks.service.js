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
  return await addDoc(collection(db, "payment_links"), {
    ...data,
    createdAt: serverTimestamp(),
    status: "active",
  })
}

export const getPaymentLinks = async () => {
  const q = query(
    collection(db, "payment_links"),
    orderBy("createdAt", "desc")
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}
