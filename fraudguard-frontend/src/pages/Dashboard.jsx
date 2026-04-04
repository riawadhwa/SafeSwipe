import AdminLayout from "@/components/layout/AdminLayout"
import PageHeader from "@/components/layout/PageHeader"
import StatCard from "@/components/dashboard/StatCard"
import { useState, useEffect } from "react"
import { useTransactions } from "@/context/TransactionContext"
import { listenToCustomers } from "@/services/customers.service"
import { X } from "lucide-react"
import TransactionDetailsDialog from "@/components/transactions/TransactionDetailsDialog"
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  TrendingUp
} from "lucide-react"

export default function Dashboard() {
  const { transactions: allTransactions } = useTransactions()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalStatus, setModalStatus] = useState(null)
  const [selectedTx, setSelectedTx] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [customers, setCustomers] = useState([])

  useEffect(() => {
    const unsubscribe = listenToCustomers((data) => {
      setCustomers(data)
    })
    return () => unsubscribe()
  }, [])

  const stats = {
    completed: allTransactions.filter(tx => tx.status === "completed").length,
    review: allTransactions.filter(tx => tx.status === "review").length,
    declined: allTransactions.filter(tx => tx.status === "declined").length,
  }
  const totalTransactions = stats.completed + stats.review + stats.declined

  const openTransaction = (tx) => {
    setSelectedTx(tx)
    setDetailsOpen(true)
  }

  const statusParts = [
    { label: "Completed", count: stats.completed, color: "#16a34a" },
    { label: "Review", count: stats.review, color: "#eab308" },
    { label: "Declined", count: stats.declined, color: "#dc2626" },
  ]

  const statusRing = (() => {
    if (totalTransactions === 0) {
      return "conic-gradient(#e2e8f0 0deg 360deg)"
    }
    let acc = 0
    const segments = statusParts.map((part) => {
      const start = acc
      const sweep = (part.count / totalTransactions) * 360
      acc += sweep
      return `${part.color} ${start}deg ${acc}deg`
    })
    return `conic-gradient(${segments.join(",")})`
  })()

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const dailyVolume = (() => {
    const now = new Date()
    const bins = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      d.setDate(now.getDate() - i)
      bins.push({
        key: d.toDateString(),
        label: dayNames[d.getDay()],
        count: 0,
      })
    }

    const map = new Map(bins.map((b) => [b.key, b]))
    allTransactions.forEach((tx) => {
      const raw = tx.createdAt?.toDate?.() || new Date(tx.createdAt)
      if (Number.isNaN(raw.getTime())) return
      const key = new Date(raw.getFullYear(), raw.getMonth(), raw.getDate()).toDateString()
      if (map.has(key)) map.get(key).count += 1
    })

    return bins
  })()
  const maxDaily = Math.max(...dailyVolume.map((d) => d.count), 1)

  const getFilteredTransactions = () => {
    if (!modalStatus) return allTransactions
    return allTransactions.filter(tx => tx.status === modalStatus)
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of fraud detection activity"
      />

      <div className="grid grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Customers" value={customers.length} icon={<Users />} color="bg-blue-100 text-blue-600" />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle />}
          color="bg-green-100 text-green-600"
          onClick={() => {
            setModalStatus("completed")
            setModalOpen(true)
          }}
        />
        <StatCard
          title="Under Review"
          value={stats.review}
          icon={<Clock />}
          color="bg-yellow-100 text-yellow-600"
          onClick={() => {
            setModalStatus("review")
            setModalOpen(true)
          }}
        />
        <StatCard title="Flagged" value="0" icon={<AlertTriangle />} color="bg-red-100 text-red-600" />
        <StatCard
          title="Declined"
          value={stats.declined}
          icon={<XCircle />}
          color="bg-slate-200 text-slate-600"
          onClick={() => {
            setModalStatus("declined")
            setModalOpen(true)
          }}
        />
        <StatCard title="Total Transactions" value={totalTransactions} icon={<TrendingUp />} color="bg-purple-100 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Transaction Status Mix</h3>
          <div className="flex items-center gap-6">
            <div
              className="h-36 w-36 rounded-full grid place-items-center"
              style={{ background: statusRing }}
            >
              <div className="h-20 w-20 rounded-full bg-white grid place-items-center border text-center">
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-lg font-semibold">{totalTransactions}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {statusParts.map((part) => (
                <div key={part.label} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: part.color }} />
                  <span className="text-slate-600">{part.label}</span>
                  <span className="font-medium">{part.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Transactions (Last 7 Days)</h3>
          <div className="h-40 flex items-end gap-3">
            {dailyVolume.map((day) => (
              <div key={day.key} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-slate-100 rounded-md h-28 flex items-end">
                  <div
                    className="w-full bg-blue-500 rounded-md"
                    style={{ height: `${(day.count / maxDaily) * 100}%` }}
                    title={`${day.label}: ${day.count}`}
                  />
                </div>
                <p className="text-xs text-slate-500">{day.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border">
        <h3 className="px-6 pt-6 font-semibold">Recent Transactions</h3>
        <table className="w-full text-sm mt-4">
          <thead className="border-b text-slate-500">
            <tr>
              <th className="px-6 py-3 text-left">Txn ID</th>
              <th className="px-6 py-3 text-left">Link ID</th>
              <th className="px-6 py-3 text-left">Amount</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody>
            {allTransactions.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-6 text-center text-slate-500">
                  No transactions yet
                </td>
              </tr>
            ) : (
              allTransactions.slice(0, 10).map(tx => (
                <tr key={tx.id} className="border-b hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openTransaction(tx)}
                      className="text-blue-700 hover:underline"
                    >
                      {String(tx.id).slice(0, 10)}...
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openTransaction(tx)}
                      className="text-blue-700 hover:underline"
                    >
                      {tx.paymentLinkId || "—"}
                    </button>
                  </td>
                  <td className="px-6 py-4">{tx.amount ?? "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.status === "completed" ? "bg-green-100 text-green-700" :
                      tx.status === "review" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {tx.createdAt?.toDate?.().toLocaleString() || new Date(tx.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-[600px] max-h-[80vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-black"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-semibold mb-4 capitalize">
              {modalStatus} Transactions
            </h3>

            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="p-3 text-left">Txn ID</th>
                  <th className="p-3 text-left">Link ID</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredTransactions().map(tx => (
                  <tr key={tx.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">
                      <button
                        onClick={() => openTransaction(tx)}
                        className="text-blue-700 hover:underline"
                      >
                        {String(tx.id).slice(0, 10)}...
                      </button>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => openTransaction(tx)}
                        className="text-blue-700 hover:underline"
                      >
                        {tx.paymentLinkId || "—"}
                      </button>
                    </td>
                    <td className="p-3">{tx.amount ?? "—"}</td>
                    <td className="p-3 capitalize">{tx.status}</td>
                    <td className="p-3">
                      {tx.createdAt?.toDate?.().toLocaleString() || new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TransactionDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        transaction={selectedTx}
      />
    </AdminLayout>
  )
}
