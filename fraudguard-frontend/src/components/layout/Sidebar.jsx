import { Link, useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  Link as LinkIcon,
  LogOut,
  Shield
} from "lucide-react"
import { logout } from "@/services/auth.service"

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsub()
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      navigate("/")
    } catch (error) {
      console.error("Logout failed:", error)
      alert("Logout failed")
    }
  }

  const menu = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Customers", path: "/customers", icon: Users },
    { name: "Fraudulent", path: "/fraudulent", icon: AlertTriangle },
    { name: "Payment Links", path: "/payment-links", icon: LinkIcon },
  ]

  return (
    <aside className="w-72 min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col">

      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
          <Shield size={20} />
        </div>
        <div>
          <p className="font-bold text-lg">SafeSwipe</p>
          <p className="text-xs text-slate-400">Admin Panel</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="px-4 space-y-1 flex-1">
        {menu.map((item) => {
          const Icon = item.icon
          const active = location.pathname === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition
                ${active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-700"
                }`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-slate-700">
        <p className="text-sm">
          {user?.email || "Loading..."}
        </p>
        <p className="text-xs text-slate-400 mb-3">
          Admin
        </p>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

    </aside>
  )
}
