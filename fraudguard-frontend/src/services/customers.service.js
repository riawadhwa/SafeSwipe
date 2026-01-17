import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

export function listenToCustomers(callback) {
  return onSnapshot(collection(db, "customers"), (snapshot) => {
    const customers = snapshot.docs.map(doc => doc.data())
    callback(customers)
  })
}
