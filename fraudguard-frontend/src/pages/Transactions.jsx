import AdminLayout from "@/components/layout/AdminLayout"
import PageHeader from "@/components/layout/PageHeader"
import { useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { listenToTransactions } from "@/services/transactions.service"
import TransactionDetailsDialog from "@/components/transactions/TransactionDetailsDialog"

export default function Transactions() {
    const { state } = useLocation()
    const filterStatus = state?.status
    const [transactions, setTransactions] = useState([])
    const [selectedTx, setSelectedTx] = useState(null)
    const [openDetails, setOpenDetails] = useState(false)

    const openTransaction = (tx) => {
        setSelectedTx(tx)
        setOpenDetails(true)
    }

    useEffect(() => {
        const unsub = listenToTransactions((data) => {
            if (filterStatus) {
                setTransactions(data.filter(t => t.status === filterStatus))
            } else {
                setTransactions(data)
            }
        })
        return () => unsub()
    }, [filterStatus])

    return (
        <AdminLayout>
            <PageHeader
                title="Transactions"
                subtitle={
                    filterStatus
                        ? `Showing ${filterStatus} transactions`
                        : "All transactions"
                }
            />

            <div className="bg-white rounded-xl border">
                <table className="w-full text-sm">
                    <thead className="border-b bg-slate-50">
                        <tr>
                            <th className="p-3 text-left">Txn ID</th>
                            <th className="p-3 text-left">Link</th>
                            <th className="p-3 text-left">Amount</th>
                            <th className="p-3 text-left">Status</th>
                            <th className="p-3 text-left">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(tx => (
                            <tr key={tx.id} className="border-b">
                                <td className="p-3">
                                    <button
                                        className="text-blue-700 hover:underline"
                                        onClick={() => openTransaction(tx)}
                                    >
                                        {String(tx.id).slice(0, 10)}...
                                    </button>
                                </td>
                                <td className="p-3">
                                    <button
                                        className="text-blue-700 hover:underline"
                                        onClick={() => openTransaction(tx)}
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

            <TransactionDetailsDialog
                open={openDetails}
                onOpenChange={setOpenDetails}
                transaction={selectedTx}
            />
        </AdminLayout>
    )
}
