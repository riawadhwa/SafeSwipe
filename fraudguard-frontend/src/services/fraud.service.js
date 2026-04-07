const API_BASE = import.meta.env.VITE_FRAUD_API_BASE_URL || "/ml-api"

export async function predictFraud(payload) {
    try {
        const res = await fetch(`${API_BASE}/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })

        if (!res.ok) {
            const details = await res.text()
            console.error("Fraud API error:", res.status, details)
            throw new Error(`Fraud detection API failed (${res.status})`)
        }

        return await res.json()
    } catch (error) {
        console.error("Fraud prediction error:", error)
        throw error
    }
}

export async function assessTransaction(payload) {
    try {
        const res = await fetch(`${API_BASE}/assess-transaction`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })

        if (!res.ok) {
            const details = await res.text()
            console.error("Assessment API error:", res.status, details)
            throw new Error(`Transaction assessment API failed (${res.status})`)
        }

        return await res.json()
    } catch (error) {
        console.error("Transaction assessment error:", error)
        throw error
    }
}
