import AdminLayout from "@/components/layout/AdminLayout"
import PageHeader from "@/components/layout/PageHeader"
import { AlertTriangle, CheckCircle } from "lucide-react"
import { useMemo, useState } from "react"
import { useTransactions } from "@/context/TransactionContext"
import { createTransaction } from "@/services/transactions.service"

export default function Fraudulent() {
  const { transactions } = useTransactions()
  const [seeding, setSeeding] = useState(false)

  const flaggedTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const status = String(tx.status || "").toLowerCase()
      return status === "declined" || status === "review" || status === "flagged"
    })
  }, [transactions])

  const flaggedCustomers = useMemo(() => {
    const map = new Map()

    flaggedTransactions.forEach((tx) => {
      const email = (tx.customerEmail || "unknown").toLowerCase()
      const name = tx.customerName || "Unknown"
      const key = email
      const prev = map.get(key) || { email, name, total: 0, lastStatus: "" }
      prev.total += 1
      prev.lastStatus = tx.status || prev.lastStatus
      map.set(key, prev)
    })

    return Array.from(map.values())
  }, [flaggedTransactions])

  const blockedEntities = useMemo(() => {
    const entities = new Set()
    flaggedTransactions.forEach((tx) => {
      if (tx.cardNumber) entities.add(`Card ${tx.cardNumber}`)
      if (tx?.network?.ip) entities.add(`IP ${tx.network.ip}`)
    })
    return Array.from(entities)
  }, [flaggedTransactions])

  const seedDemoFlaggedTransactions = async () => {
    try {
      setSeeding(true)
      const now = Date.now()

      const demoRows = [
        {
          paymentLinkId: `demo-${now}-1`,
          customerEmail: "jane.flagged@example.com",
          customerName: "Jane Flagged",
          phone: "+1-555-0101",
          billingAddress: "New York, NY, 10001",
          shippingAddress: "New York, NY, 10001",
          cardNumber: "**** **** **** 4242",
          amount: 1299,
          status: "declined",
          mlConfidence: 0.94,
          mlFraud: true,
          riskScore: 0.92,
          riskReasons: ["consecutive_same_card_payments:4", "vpn_or_proxy_detected"],
          network: { ip: "185.220.101.1", vpnOrProxy: true }
        },
        {
          paymentLinkId: `demo-${now}-2`,
          customerEmail: "jane.flagged@example.com",
          customerName: "Jane Flagged",
          phone: "+1-555-0101",
          billingAddress: "New York, NY, 10001",
          shippingAddress: "Boston, MA, 02110",
          cardNumber: "**** **** **** 4242",
          amount: 899,
          status: "review",
          mlConfidence: 0.63,
          mlFraud: true,
          riskScore: 0.68,
          riskReasons: ["billing_shipping_mismatch", "high_card_velocity_10m:5"],
          network: { ip: "185.220.101.1", vpnOrProxy: true }
        },
        {
          paymentLinkId: `demo-${now}-3`,
          customerEmail: "sam.review@example.com",
          customerName: "Sam Review",
          phone: "+1-555-0102",
          billingAddress: "Chicago, IL, 60601",
          shippingAddress: "Chicago, IL, 60601",
          cardNumber: "**** **** **** 1111",
          amount: 599,
          status: "review",
          mlConfidence: 0.58,
          mlFraud: true,
          riskScore: 0.61,
          riskReasons: ["email_seen_with_different_name"],
          network: { ip: "198.51.100.7", vpnOrProxy: false }
        }
      ]

      await Promise.all(demoRows.map((row) => createTransaction(row)))
      alert("Seeded demo flagged transactions.")
    } catch (error) {
      console.error(error)
      alert("Failed to seed demo flagged transactions")
    } finally {
      setSeeding(false)
    }
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Fraudulent Activity"
        subtitle="Manage flagged customers and blocked entities"
      />

      <div className="mb-4 flex justify-end">
        <button
          onClick={seedDemoFlaggedTransactions}
          disabled={seeding}
          className="px-4 py-2 rounded-md bg-slate-900 text-white disabled:opacity-60"
        >
          {seeding ? "Seeding..." : "Seed Demo Flagged Transactions"}
        </button>
      </div>

      {flaggedCustomers.length === 0 ? (
        <div className="bg-white rounded-xl p-10 border text-center mb-6">
          <CheckCircle className="mx-auto text-green-500" size={40} />
          <p className="mt-2 text-slate-500">No flagged customers</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-6 border mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Flagged Customers</h3>
          <div className="space-y-3">
            {flaggedCustomers.map((c) => (
              <div key={c.email} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <p className="text-sm text-slate-500">{c.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">{c.total} flagged txns</p>
                  <p className="text-sm font-medium text-amber-700">Latest: {c.lastStatus}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {blockedEntities.length === 0 ? (
        <div className="bg-white rounded-xl p-10 border text-center">
          <CheckCircle className="mx-auto text-green-500" size={40} />
          <p className="mt-2 text-slate-500">No blocked entities</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-6 border">
          <h3 className="font-semibold text-slate-900 mb-4">Blocked / High-Risk Entities</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {blockedEntities.map((entity) => (
              <div key={entity} className="border rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={16} />
                <span className="text-sm text-slate-700">{entity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
