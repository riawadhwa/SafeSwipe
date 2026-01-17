import { useState, useEffect } from "react"
import AdminLayout from "@/components/layout/AdminLayout"
import PageHeader from "@/components/layout/PageHeader"
import { Plus, Copy, X } from "lucide-react"
import { createPaymentLink, getPaymentLinks } from "@/services/paymentLinks.service"

export default function PaymentLinks() {
    const [links, setLinks] = useState([])

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [linkFormData, setLinkFormData] = useState({
        amount: 100,
        currency: "USD",
        country: "India"
    })

    useEffect(() => {
        fetchLinks()
    }, [])

    const fetchLinks = async () => {
        try {
            const data = await getPaymentLinks()
            setLinks(data)
        } catch (error) {
            console.error("Failed to fetch links:", error)
        }
    }

    const handleCreateLink = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await createPaymentLink({
                amount: parseFloat(linkFormData.amount),
                currency: linkFormData.currency,
                country: linkFormData.country,
                expiresAt: Date.now() + 86400000,
                used: false,
                createdAt: Date.now()
            })
            console.log("Payment link created with amount:", linkFormData.amount)
            alert("Payment link created successfully!")
            setOpen(false)
            setLinkFormData({ amount: 100, currency: "USD", country: "India" })
            await fetchLinks()
        } catch (error) {
            console.error(error)
            alert("Failed to create payment link")
        } finally {
            setLoading(false)
        }
    }

    const handleCopyLink = (linkCode) => {
        const link = `${window.location.origin}/pay/${linkCode}`
        navigator.clipboard.writeText(link)
        alert("Payment link copied!")
    }

    return (
        <AdminLayout>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <PageHeader
                    title="Payment Links"
                    subtitle="Create and manage payment links for customers"
                />

                <button
                    onClick={() => setOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    <Plus size={16} />
                    Create Link
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border">
                <h3 className="px-6 pt-6 font-semibold">All Payment Links</h3>

                <table className="w-full text-sm mt-4">
                    <thead className="border-b text-slate-500">
                        <tr>
                            <th className="px-6 py-3 text-left">Link Code</th>
                            <th className="px-6 py-3 text-left">Amount</th>
                            <th className="px-6 py-3 text-left">Country</th>
                            <th className="px-6 py-3 text-left">Status</th>
                            <th className="px-6 py-3 text-left">Expires</th>
                            <th className="px-6 py-3 text-left">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {links.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-6 text-center text-slate-500">
                                    No payment links created yet
                                </td>
                            </tr>
                        )}

                        {links.map((link) => {
                            const isExpired = link.expiresAt && Date.now() > link.expiresAt
                            const isUsed = link.used || link.status === "used"

                            return (
                                <tr key={link.id} className="border-b">
                                    <td className="px-6 py-4">{link.id.slice(0, 7).toUpperCase()}</td>
                                    <td className="px-6 py-4">
                                        {link.currency} {link.amount}
                                    </td>
                                    <td className="px-6 py-4">{link.country}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs ${isUsed ? "bg-slate-200 text-slate-700" :
                                            isExpired ? "bg-red-100 text-red-700" :
                                                "bg-green-100 text-green-700"
                                            }`}>
                                            {isUsed ? "Used" : isExpired ? "Expired" : "Active"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {link.expiresAt
                                            ? new Date(link.expiresAt).toLocaleString()
                                            : "—"}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleCopyLink(link.id)}
                                            className="flex items-center gap-1 text-slate-600 hover:text-black"
                                            disabled={isUsed || isExpired}
                                        >
                                            <Copy size={14} />
                                            Copy
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* CREATE PAYMENT LINK MODAL */}
            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-[420px] max-h-[90vh] overflow-y-auto p-6 relative">
                        {/* Close */}
                        <button
                            onClick={() => setOpen(false)}
                            className="absolute right-4 top-4 text-slate-500 hover:text-black"
                        >
                            <X size={18} />
                        </button>

                        <h3 className="text-lg font-semibold mb-4">
                            Create Payment Link
                        </h3>

                        {/* Amount + Currency */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="text-sm text-slate-600">Amount</label>
                                <input
                                    type="number"
                                    value={linkFormData.amount}
                                    onChange={(e) => setLinkFormData(prev => ({ ...prev, amount: e.target.value }))}
                                    className="w-full mt-1 border rounded-lg px-3 py-2"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Currency</label>
                                <select
                                    value={linkFormData.currency}
                                    onChange={(e) => setLinkFormData(prev => ({ ...prev, currency: e.target.value }))}
                                    className="w-full mt-1 border rounded-lg px-3 py-2"
                                >
                                    <option>USD</option>
                                    <option>INR</option>
                                </select>
                            </div>
                        </div>

                        {/* Amount Preview */}
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-600">Payment Amount</p>
                            <p className="text-xl font-bold text-blue-900 mt-1">
                                {linkFormData.currency} {parseFloat(linkFormData.amount).toFixed(2)}
                            </p>
                        </div>

                        {/* Country */}
                        <div className="mb-4">
                            <label className="text-sm text-slate-600">
                                Target Country
                            </label>
                            <select
                                value={linkFormData.country}
                                onChange={(e) => setLinkFormData(prev => ({ ...prev, country: e.target.value }))}
                                className="w-full mt-1 border rounded-lg px-3 py-2"
                            >
                                <option>India</option>
                                <option>United States</option>
                            </select>
                        </div>

                        {/* Exempt Rules */}
                        <div className="mb-6">
                            <p className="text-sm font-medium mb-2">
                                Exempt Rules (Optional)
                            </p>

                            {[
                                "Multiple credit cards check",
                                "Flagged IP/Email/MAC check",
                                "Unusual email domain check",
                                "Transaction frequency check",
                                "Billing ≠ Shipping address",
                                "VPN detection",
                            ].map((rule) => (
                                <div
                                    key={rule}
                                    className="flex justify-between items-center py-2 border-b text-sm"
                                >
                                    <span>{rule}</span>
                                    <input type="checkbox" className="scale-110" />
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleCreateLink}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded-lg"
                        >
                            {loading ? "Creating..." : "Generate Payment Link"}
                        </button>
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}
