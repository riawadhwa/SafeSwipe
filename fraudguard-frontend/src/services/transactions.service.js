import { db } from "@/lib/firebase"
import {
    collection,
    addDoc,
    serverTimestamp,
    onSnapshot,
    query,
    orderBy,
} from "firebase/firestore"

export const createTransaction = async (data) => {
    return await addDoc(collection(db, "transactions"), {
        ...data,
        createdAt: serverTimestamp(),
    })
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
