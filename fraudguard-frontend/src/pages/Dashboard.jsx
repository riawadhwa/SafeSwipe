import AdminLayout from "@/components/layout/AdminLayout"
import PageHeader from "@/components/layout/PageHeader"
import StatCard from "@/components/dashboard/StatCard"
import { useState, useEffect } from "react"
import { useTransactions } from "@/context/TransactionContext"
import { listenToCustomers } from "@/services/customers.service"
import { X } from "lucide-react"
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
        <StatCard title="Total Transactions" value={stats.completed + stats.review + stats.declined} icon={<TrendingUp />} color="bg-purple-100 text-purple-600" />
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border">
        <h3 className="px-6 pt-6 font-semibold">Recent Transactions</h3>
        <table className="w-full text-sm mt-4">
          <thead className="border-b text-slate-500">
            <tr>
              <th className="px-6 py-3 text-left">Link ID</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody>
            {allTransactions.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-6 py-6 text-center text-slate-500">
                  No transactions yet
                </td>
              </tr>
            ) : (
              allTransactions.slice(0, 10).map(tx => (
                <tr key={tx.id} className="border-b hover:bg-slate-50">
                  <td className="px-6 py-4">{tx.paymentLinkId}</td>
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
                  <th className="p-3 text-left">Link ID</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredTransactions().map(tx => (
                  <tr key={tx.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">{tx.paymentLinkId}</td>
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
    </AdminLayout>
  )
}
