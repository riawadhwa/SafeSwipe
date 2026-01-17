import { db } from "@/lib/firebase"
import {
    collection,
    addDoc,
    doc,
    setDoc,
    serverTimestamp,
    onSnapshot,
    query,
    orderBy,
    increment,
} from "firebase/firestore"

export const createTransaction = async (data) => {
    const txnRef = doc(collection(db, "transactions"), crypto.randomUUID())
    await setDoc(txnRef, {
        ...data,
        createdAt: serverTimestamp(),
    })

    // Update customer aggregation
    if (data.customerEmail) {
        const customerRef = doc(db, "customers", data.customerEmail)
        await setDoc(
            customerRef,
            {
                email: data.customerEmail,
                name: data.customerName,
                phone: data.phone,
                totalTransactions: increment(1),
                lastTransactionAt: serverTimestamp(),
                flagged: data.status === "declined" || data.status === "flagged"
            },
            { merge: true }
        )
    }

    return txnRef
}

export const listenToTransactions = (callback) => {
    const q = query(
        collection(db, "transactions"),
        orderBy("createdAt", "desc")
    )

    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
        callback(data)
    })
}
