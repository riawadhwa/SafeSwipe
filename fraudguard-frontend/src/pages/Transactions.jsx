import AdminLayout from "@/components/layout/AdminLayout"
import PageHeader from "@/components/layout/PageHeader"
import { useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { listenToTransactions } from "@/services/transactions.service"

export default function Transactions() {
    const { state } = useLocation()
    const filterStatus = state?.status
    const [transactions, setTransactions] = useState([])

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
                            <th className="p-3 text-left">Link</th>
                            <th className="p-3 text-left">Status</th>
                            <th className="p-3 text-left">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(tx => (
                            <tr key={tx.id} className="border-b">
                                <td className="p-3">{tx.paymentLinkId}</td>
                                <td className="p-3 capitalize">{tx.status}</td>
                                <td className="p-3">
                                    {tx.createdAt?.toDate().toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    )
}
