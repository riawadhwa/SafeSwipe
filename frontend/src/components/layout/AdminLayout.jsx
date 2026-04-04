import Sidebar from "./Sidebar"

export default function AdminLayout({ children }) {
  return (
    <div className="flex bg-slate-100 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
