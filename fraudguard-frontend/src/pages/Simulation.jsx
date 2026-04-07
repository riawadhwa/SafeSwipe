import { useMemo, useState } from "react"
import AdminLayout from "@/components/layout/AdminLayout"
import PageHeader from "@/components/layout/PageHeader"
import { predictFraud } from "@/services/fraud.service"

const DEFAULT_PAYLOAD = {
    amt: 245.75,
    category: "shopping_net",
    gender: "F",
    dob: "1994-08-21",
    city_pop: 185000,
    lat: 40.7128,
    long: -74.006,
    merch_lat: 40.758,
    merch_long: -73.9855,
    trans_date_trans_time: "2026-04-06T12:45:00Z",
}

const REQUIRED_FIELDS = [
    "amt",
    "category",
    "gender",
    "dob",
    "city_pop",
    "lat",
    "long",
    "merch_lat",
    "merch_long",
    "trans_date_trans_time",
]

function prettyJson(value) {
    return JSON.stringify(value, null, 2)
}

function getValidationErrors(parsed) {
    const missing = REQUIRED_FIELDS.filter((field) => parsed[field] === undefined)
    const errors = []

    if (missing.length) {
        errors.push(`Missing required fields: ${missing.join(", ")}`)
    }

    if (parsed.gender !== undefined && !["M", "F"].includes(parsed.gender)) {
        errors.push("`gender` must be either 'M' or 'F'.")
    }

    return errors
}

export default function Simulation() {
    const [payloadText, setPayloadText] = useState(prettyJson(DEFAULT_PAYLOAD))
    const [result, setResult] = useState(null)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const parsedPreview = useMemo(() => {
        try {
            return JSON.parse(payloadText)
        } catch {
            return null
        }
    }, [payloadText])

    const runSimulation = async () => {
        setError("")
        setResult(null)

        let parsed
        try {
            parsed = JSON.parse(payloadText)
        } catch {
            setError("Invalid JSON format. Fix the payload and try again.")
            return
        }

        const validationErrors = getValidationErrors(parsed)
        if (validationErrors.length) {
            setError(validationErrors.join(" "))
            return
        }

        try {
            setLoading(true)
            const response = await predictFraud(parsed)
            setResult(response)
        } catch (apiError) {
            setError(apiError?.message || "Prediction failed. Check API connection.")
        } finally {
            setLoading(false)
        }
    }

    const confidencePercent = result ? (result.confidence * 100).toFixed(2) : null

    return (
        <AdminLayout>
            <PageHeader
                title="ML Simulation"
                subtitle="Paste transaction JSON and simulate model fraud prediction"
            />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded-xl border bg-white p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Prediction Input JSON</h3>
                        <button
                            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                            onClick={() => setPayloadText(prettyJson(DEFAULT_PAYLOAD))}
                        >
                            Reset Sample
                        </button>
                    </div>

                    <textarea
                        className="h-[420px] w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm outline-none focus:border-blue-500"
                        value={payloadText}
                        onChange={(e) => setPayloadText(e.target.value)}
                        spellCheck={false}
                    />

                    <div className="mt-4 flex items-center gap-3">
                        <button
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                            onClick={runSimulation}
                            disabled={loading}
                        >
                            {loading ? "Running..." : "Run Prediction"}
                        </button>
                        <button
                            className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                            onClick={() => setPayloadText(prettyJson(parsedPreview || DEFAULT_PAYLOAD))}
                        >
                            Format JSON
                        </button>
                    </div>

                    {error && (
                        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="rounded-xl border bg-white p-6">
                        <h3 className="mb-4 text-lg font-semibold">Simulation Result</h3>

                        {!result ? (
                            <p className="text-sm text-slate-500">
                                Run a prediction to see fraud decision and confidence.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span
                                        className={`rounded-full px-3 py-1 text-sm font-medium ${result.fraud ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                            }`}
                                    >
                                        {result.fraud ? "Fraud Predicted" : "Legitimate Predicted"}
                                    </span>
                                    <span className="text-sm text-slate-600">Confidence: {confidencePercent}%</span>
                                </div>

                                <div>
                                    <div className="mb-2 flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Confidence Score</span>
                                        <span className="font-medium text-slate-700">{confidencePercent}%</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-slate-100">
                                        <div
                                            className={`h-full rounded-full ${result.fraud ? "bg-red-500" : "bg-emerald-500"}`}
                                            style={{ width: `${Math.min(result.confidence * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">Raw Response</p>
                                    <pre className="mt-2 overflow-auto text-xs text-slate-700">{prettyJson(result)}</pre>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border bg-white p-6">
                        <h3 className="mb-3 text-lg font-semibold">Required JSON Fields</h3>
                        <div className="grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
                            {REQUIRED_FIELDS.map((field) => (
                                <div key={field} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs">
                                    {field}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
