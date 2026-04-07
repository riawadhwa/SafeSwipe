import AdminLayout from "@/components/layout/AdminLayout"
import PageHeader from "@/components/layout/PageHeader"
import { useLocation } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { deleteTransactionById, listenToTransactions } from "@/services/transactions.service"
import TransactionDetailsDialog from "@/components/transactions/TransactionDetailsDialog"

function getAmount(tx) {
    if (typeof tx?.amount === "number") return tx.amount
    const parsed = Number(tx?.amount)
    return Number.isFinite(parsed) ? parsed : 0
}

function getReadableDate(tx) {
    return tx.createdAt?.toDate?.().toLocaleString() || new Date(tx.createdAt).toLocaleString()
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    }).format(value)
}

export default function Transactions() {
    const { state } = useLocation()
    const filterStatus = state?.status
    const [transactions, setTransactions] = useState([])
    const [selectedTx, setSelectedTx] = useState(null)
    const [openDetails, setOpenDetails] = useState(false)
    const [deletePending, setDeletePending] = useState(false)
    const [quickFilter, setQuickFilter] = useState(filterStatus || "all")
    const [searchTerm, setSearchTerm] = useState("")

    const openTransaction = (tx) => {
        setSelectedTx(tx)
        setOpenDetails(true)
    }

    useEffect(() => {
        const unsub = listenToTransactions((data) => {
            setTransactions(data)
        })
        return () => unsub()
    }, [filterStatus])

    const statusCounts = useMemo(() => ({
        completed: transactions.filter((tx) => tx.status === "completed").length,
        review: transactions.filter((tx) => tx.status === "review").length,
        declined: transactions.filter((tx) => tx.status === "declined").length,
    }), [transactions])

    const totalAmount = useMemo(
        () => transactions.reduce((sum, tx) => sum + getAmount(tx), 0),
        [transactions]
    )

    const filteredTransactions = useMemo(() => {
        return transactions.filter((tx) => {
            const matchesStatus = quickFilter === "all" ? true : tx.status === quickFilter
            const haystack = `${tx.id || ""} ${tx.paymentLinkId || ""} ${tx.status || ""}`.toLowerCase()
            const matchesSearch = searchTerm.trim() ? haystack.includes(searchTerm.trim().toLowerCase()) : true
            return matchesStatus && matchesSearch
        })
    }, [transactions, quickFilter, searchTerm])

    const filterOptions = [
        { id: "all", label: "All" },
        { id: "completed", label: "Completed" },
        { id: "review", label: "Review" },
        { id: "declined", label: "Declined" },
    ]

    const handleDeleteTransaction = async (tx) => {
        if (!tx?.id) return

        const confirmed = window.confirm("Delete this transaction permanently?")
        if (!confirmed) return

        try {
            setDeletePending(true)
            await deleteTransactionById(tx.id)
            setOpenDetails(false)
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
                title="Transactions"
                subtitle={
                    filterStatus
                        ? `Showing ${filterStatus} transactions`
                        : "All transactions"
                }
            />

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{transactions.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Completed</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-700">{statusCounts.completed}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Under Review</p>
                    <p className="mt-2 text-2xl font-bold text-amber-700">{statusCounts.review}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total Volume</p>
                    <p className="mt-2 text-2xl font-bold text-sky-700">{formatCurrency(totalAmount)}</p>
                </div>
            </div>

            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    {filterOptions.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setQuickFilter(item.id)}
                            className={`rounded-full px-3 py-1.5 text-sm transition ${quickFilter === item.id
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by txn id, link id, or status"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 lg:w-80"
                />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                        <thead className="sticky top-0 z-10 border-b bg-slate-50">
                            <tr>
                                <th className="p-3 text-left">Txn ID</th>
                                <th className="p-3 text-left">Link</th>
                                <th className="p-3 text-left">Amount</th>
                                <th className="p-3 text-left">Status</th>
                                <th className="p-3 text-left">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map(tx => (
                                <tr key={tx.id} className="border-b transition-colors hover:bg-slate-50/80">
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
                                    <td className="p-3 font-medium text-slate-800">{formatCurrency(getAmount(tx))}</td>
                                    <td className="p-3 capitalize">
                                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${tx.status === "completed"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : tx.status === "review"
                                                    ? "bg-amber-100 text-amber-700"
                                                    : "bg-red-100 text-red-700"
                                            }`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-600">{getReadableDate(tx)}</td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-6 text-center text-slate-500">
                                        No transactions found for your current filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <TransactionDetailsDialog
                open={openDetails}
                onOpenChange={setOpenDetails}
                transaction={selectedTx}
                onDeleteTransaction={handleDeleteTransaction}
                deletePending={deletePending}
            />
        </AdminLayout>
    )
}
