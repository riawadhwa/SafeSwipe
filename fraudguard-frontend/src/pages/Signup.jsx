import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"

export default function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  })

  const [otpInput, setOtpInput] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpStatus, setOtpStatus] = useState("")
  const [otpError, setOtpError] = useState("")

  const handleSendOtp = (e) => {
    e.preventDefault()
    if (!form.email) {
      setOtpError("Enter an email first")
      setOtpStatus("")
      return
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setOtpCode(code)
    setOtpSent(true)
    setOtpVerified(false)
    setOtpStatus(`OTP sent to ${form.email}`)
    setOtpError("")
    // Simulate sending email by logging; replace with real email service later
    console.log("OTP for", form.email, "is", code)
  }

  const handleVerifyOtp = (e) => {
    e.preventDefault()
    if (otpInput === otpCode && otpInput.length === 6) {
      setOtpVerified(true)
      setOtpStatus("OTP verified")
      setOtpError("")
    } else {
      setOtpVerified(false)
      setOtpStatus("")
      setOtpError("Incorrect OTP")
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!otpVerified) {
      setOtpError("Please verify the OTP sent to your email")
      return
    }
    navigate("/") // back to login
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-md w-96 p-8"
      >
        <h2 className="text-xl font-semibold text-center mb-6">
          SafeSwipe Admin Sign Up
        </h2>

        <input
          placeholder="Full Name"
          className="w-full border rounded-lg px-3 py-2 mb-3"
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full border rounded-lg px-3 py-2 mb-3"
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border rounded-lg px-3 py-2 mb-4"
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        <div className="mb-3 flex gap-2">
          <button
            className="flex-1 bg-slate-900 text-white py-2 rounded-lg disabled:opacity-50"
            onClick={handleSendOtp}
            disabled={otpSent && !otpVerified}
          >
            {otpSent && !otpVerified ? "OTP Sent" : "Send OTP"}
          </button>
          <button
            className="flex-1 bg-green-600 text-white py-2 rounded-lg disabled:opacity-50"
            onClick={handleVerifyOtp}
            disabled={!otpSent}
          >
            Verify OTP
          </button>
        </div>

        <input
          type="text"
          placeholder="Enter 6-digit OTP"
          maxLength={6}
          className="w-full border rounded-lg px-3 py-2 mb-2"
          value={otpInput}
          onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
        />

        {otpStatus && (
          <p className="text-sm text-green-600 mb-2">{otpStatus}</p>
        )}
        {otpError && (
          <p className="text-sm text-red-600 mb-2">{otpError}</p>
        )}

        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg">
          Sign Up
        </button>

        <p className="text-sm text-center mt-4 text-slate-500">
          Already have an account?{" "}
          <Link to="/" className="text-blue-600">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  )
}
