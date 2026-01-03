import AdminLayout from "@/components/layout/AdminLayout"
import PageHeader from "@/components/layout/PageHeader"
import { CheckCircle } from "lucide-react"

export default function Fraudulent() {
  return (
    <AdminLayout>
      <PageHeader
        title="Fraudulent Activity"
        subtitle="Manage flagged customers and blocked entities"
      />

      <div className="bg-white rounded-xl p-10 border text-center mb-6">
        <CheckCircle className="mx-auto text-green-500" size={40} />
        <p className="mt-2 text-slate-500">No flagged customers</p>
      </div>

      <div className="bg-white rounded-xl p-10 border text-center">
        <CheckCircle className="mx-auto text-green-500" size={40} />
        <p className="mt-2 text-slate-500">No blocked entities</p>
      </div>
    </AdminLayout>
  )
}
