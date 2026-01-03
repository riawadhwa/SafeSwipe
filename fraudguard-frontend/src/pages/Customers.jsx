import AdminLayout from "@/components/layout/AdminLayout"
import PageHeader from "@/components/layout/PageHeader"
import { useEffect, useState } from "react"
import { listenToCustomers } from "@/services/customers.service"

export default function Customers() {
  const [customers, setCustomers] = useState([])

  useEffect(() => {
    const unsub = listenToCustomers(setCustomers)
    return () => unsub()
  }, [])

  return (
    <AdminLayout>
      <PageHeader
        title="Customers"
        subtitle="View all registered customers and transaction counts"
      />

      <div className="bg-white rounded-xl border mt-6">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Email</th>
              <th className="px-6 py-3 text-left font-semibold">Name</th>
              <th className="px-6 py-3 text-left font-semibold">Transactions</th>
            </tr>
          </thead>

          <tbody>
            {customers.length > 0 ? (
              customers.map((c) => (
                <tr key={c.email} className="border-b hover:bg-slate-50 transition">
                  <td className="px-6 py-4">{c.email}</td>
                  <td className="px-6 py-4">{c.name || "-"}</td>
                  <td className="px-6 py-4 font-medium">{c.totalTransactions || 0}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="px-6 py-8 text-center text-slate-500">
                  No customers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
