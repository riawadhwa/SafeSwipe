import AdminLayout from "@/components/layout/AdminLayout"
import PageHeader from "@/components/layout/PageHeader"
import StatCard from "@/components/dashboard/StatCard"
import { useState, useEffect, useMemo } from "react"
import { useTransactions } from "@/context/TransactionContext"
import { listenToCustomers } from "@/services/customers.service"
import { deleteTransactionById } from "@/services/transactions.service"
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

function getTxDate(tx) {
  const date = tx?.createdAt?.toDate?.() || new Date(tx?.createdAt)
  return Number.isNaN(date.getTime()) ? null : date
}

function getAmount(tx) {
  if (typeof tx?.amount === "number") return tx.amount
  const parsed = Number(tx?.amount)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatCompactCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value)
}

function buildSparklinePoints(values) {
  const width = 120
  const height = 34
  const pad = 3
  const chartW = width - pad * 2
  const chartH = height - pad * 2
  const max = Math.max(...values, 1)

  return values
    .map((value, index) => {
      const x = pad + (index / Math.max(values.length - 1, 1)) * chartW
      const y = pad + chartH - (value / max) * chartH
      return `${x},${y}`
    })
    .join(" ")
}

export default function Dashboard() {
  const { transactions: allTransactions } = useTransactions()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalStatus, setModalStatus] = useState(null)
  const [selectedTx, setSelectedTx] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [customers, setCustomers] = useState([])
  const [deletePending, setDeletePending] = useState(false)

  useEffect(() => {
    const unsubscribe = listenToCustomers((data) => {
      setCustomers(data)
    })
    return () => unsubscribe()
  }, [])

  const stats = useMemo(() => ({
    completed: allTransactions.filter((tx) => tx.status === "completed").length,
    review: allTransactions.filter((tx) => tx.status === "review").length,
    declined: allTransactions.filter((tx) => tx.status === "declined").length,
  }), [allTransactions])
  const totalTransactions = stats.completed + stats.review + stats.declined
  const flaggedTransactions = stats.review + stats.declined
  const approvalRate = totalTransactions ? ((stats.completed / totalTransactions) * 100).toFixed(1) : "0.0"

  const totalAmount = useMemo(
    () => allTransactions.reduce((sum, tx) => sum + getAmount(tx), 0),
    [allTransactions]
  )

  const averageAmount = totalTransactions ? totalAmount / totalTransactions : 0

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
  const dailyVolume = useMemo(() => {
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
      const raw = getTxDate(tx)
      if (Number.isNaN(raw.getTime())) return
      const key = new Date(raw.getFullYear(), raw.getMonth(), raw.getDate()).toDateString()
      if (map.has(key)) map.get(key).count += 1
    })

    return bins
  }, [allTransactions])

  const maxDaily = Math.max(...dailyVolume.map((d) => d.count), 1)
  const dailyPoints = buildSparklinePoints(dailyVolume.map((d) => d.count))

  const getFilteredTransactions = () => {
    if (!modalStatus) return allTransactions
    return allTransactions.filter(tx => tx.status === modalStatus)
  }

  const handleDeleteTransaction = async (tx) => {
    if (!tx?.id) return

    const confirmed = window.confirm("Delete this transaction permanently?")
    if (!confirmed) return

    try {
      setDeletePending(true)
      await deleteTransactionById(tx.id)
      setDetailsOpen(false)
      setSelectedTx(null)
    } catch (error) {
      console.error("Failed to delete transaction:", error)
      alert("Failed to delete transaction. Please try again.")
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of fraud detection activity"
      />

      <div className="mb-7 rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-700 via-cyan-700 to-teal-700 px-6 py-6 text-white shadow-lg animate-enter">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Live Monitoring</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{totalTransactions} Transactions Processed</h2>
            <p className="mt-1 text-sm text-cyan-100">
              Approval rate at {approvalRate}%, with {flaggedTransactions} transactions flagged for manual checks.
            </p>
          </div>
          <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur">
            <p className="text-xs text-cyan-100">Volume Last 7 Days</p>
            <svg viewBox="0 0 120 34" className="mt-1 h-10 w-32">
              <polyline
                points={dailyPoints}
                fill="none"
                stroke="#e0f2fe"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Customers"
          value={customers.length}
          subtitle="Registered accounts"
          icon={<Users />}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          subtitle="Clean approvals"
          trend={`${approvalRate}% approval rate`}
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
          subtitle="Needs analyst check"
          icon={<Clock />}
          color="bg-yellow-100 text-yellow-600"
          onClick={() => {
            setModalStatus("review")
            setModalOpen(true)
          }}
        />
        <StatCard
          title="Flagged"
          value={flaggedTransactions}
          subtitle="Review + declined"
          icon={<AlertTriangle />}
          color="bg-red-100 text-red-600"
        />
        <StatCard
          title="Declined"
          value={stats.declined}
          subtitle="High-risk blocked"
          icon={<XCircle />}
          color="bg-slate-200 text-slate-600"
          onClick={() => {
            setModalStatus("declined")
            setModalOpen(true)
          }}
        />
        <StatCard
          title="Total Volume"
          value={formatCompactCurrency(totalAmount)}
          subtitle={`Avg ticket ${formatCompactCurrency(averageAmount)}`}
          trend={`Exact ${formatCurrency(totalAmount)}`}
          icon={<TrendingUp />}
          color="bg-violet-100 text-violet-700"
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-enter">
          <h3 className="font-semibold mb-4">Transaction Status Mix</h3>
          <p className="mb-3 text-xs text-slate-500">
            Key: ring segment color maps to each status, with count and share.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <div
              className="h-36 w-36 rounded-full grid place-items-center"
              style={{ background: statusRing }}
            >
              <div className="h-20 w-20 rounded-full bg-white grid place-items-center border text-center">
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-lg font-semibold">{totalTransactions}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm min-w-[220px]">
              {statusParts.map((part) => (
                <div key={part.label} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: part.color }} />
                  <span className="text-slate-600">{part.label}</span>
                  </div>
                  <span className="font-medium">{part.count}</span>
                  <span className="text-xs text-slate-400">
                    ({totalTransactions ? Math.round((part.count / totalTransactions) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-enter">
          <h3 className="font-semibold mb-4">Transactions (Last 7 Days)</h3>
          <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
            <div className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
              <span>Blue bar = number of transactions</span>
            </div>
            <span>Top scale: {maxDaily}</span>
          </div>
          <div className="h-44 flex items-end gap-3">
            {dailyVolume.map((day) => (
              <div key={day.key} className="flex-1 flex flex-col items-center gap-2">
                <p className="text-[11px] font-medium text-slate-600">{day.count}</p>
                <div className="w-full bg-slate-100 rounded-md h-28 flex items-end">
                  <div
                    className="w-full rounded-md bg-gradient-to-t from-cyan-600 to-sky-400 transition-all hover:opacity-90"
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
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h3 className="px-6 pt-6 font-semibold">Recent Transactions</h3>
        <div className="overflow-x-auto">
        <table className="mt-4 w-full min-w-[760px] text-sm">
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
                <tr key={tx.id} className="border-b transition-colors hover:bg-slate-50/80">
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
        onDeleteTransaction={handleDeleteTransaction}
        deletePending={deletePending}
      />
    </AdminLayout>
  )
}
