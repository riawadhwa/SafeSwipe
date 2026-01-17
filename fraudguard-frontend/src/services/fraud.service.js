export async function predictFraud(payload) {
    try {
        const res = await fetch("http://127.0.0.1:5000/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })

        if (!res.ok) {
            console.error("Fraud API error:", res.status)
            throw new Error("Fraud detection API failed")
        }

        return await res.json()
    } catch (error) {
        console.error("Fraud prediction error:", error)
        throw error
    }
}
