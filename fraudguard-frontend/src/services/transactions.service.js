import { db } from "@/lib/firebase"
import {
    collection,
    doc,
    setDoc,
    serverTimestamp,
    onSnapshot,
    query,
    orderBy,
    increment,
    deleteDoc,
    getDoc,
    runTransaction,
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

export const deleteTransactionById = async (transactionId) => {
    const txnRef = doc(db, "transactions", transactionId)
    const txnSnap = await getDoc(txnRef)

    if (!txnSnap.exists()) {
        throw new Error("Transaction not found")
    }

    const txData = txnSnap.data()
    const customerEmail = txData?.customerEmail

    await deleteDoc(txnRef)

    if (customerEmail) {
        const customerRef = doc(db, "customers", customerEmail)
        await runTransaction(db, async (transaction) => {
            const customerSnap = await transaction.get(customerRef)
            if (!customerSnap.exists()) return

            const current = Number(customerSnap.data()?.totalTransactions || 0)
            transaction.set(
                customerRef,
                {
                    totalTransactions: Math.max(current - 1, 0),
                    lastTransactionAt: serverTimestamp(),
                },
                { merge: true }
            )
        })
    }
}
