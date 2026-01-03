import { useParams } from "react-router-dom"
import { useState, useEffect } from "react"
import { CreditCard, ShieldCheck, XCircle } from "lucide-react"
import { doc, setDoc, increment, serverTimestamp, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { createTransaction } from "@/services/transactions.service"

export default function PaymentPage() {
  const { linkCode } = useParams()
  const [status, setStatus] = useState("form")
  const [linkStatus, setLinkStatus] = useState("loading")
  const [linkError, setLinkError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cnic: "",
    billingAddress: "",
    shippingAddress: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
    amount: 100
  })

  useEffect(() => {
    const checkLinkValidity = async () => {
      try {
        const linkRef = doc(db, "payment_links", linkCode)
        const linkSnap = await getDoc(linkRef)

        if (!linkSnap.exists()) {
          setLinkStatus("invalid")
          setLinkError("Invalid payment link")
          return
        }

        const linkData = linkSnap.data()

        // Check if link is already used
        if (linkData.used) {
          setLinkStatus("expired")
          setLinkError("This payment link has already been used")
          return
        }

        // Check if link has expired (24 hours from creation)
        const expiresAt = linkData.expiresAt
        if (expiresAt && Date.now() > expiresAt) {
          setLinkStatus("expired")
          setLinkError("This payment link has expired")
          return
        }

        setLinkStatus("valid")
      } catch (error) {
        console.error("Error checking link:", error)
        setLinkStatus("error")
        setLinkError("Failed to verify payment link")
      }
    }

    if (linkCode) {
      checkLinkValidity()
    }
  }, [linkCode])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '') // Remove non-digits
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4)
    }
    setFormData(prev => ({
      ...prev,
      cardExpiry: value.slice(0, 5) // MM/YY max 5 chars
    }))
  }

  const handlePay = async (e) => {
    e.preventDefault()

    // Validate card expiry
    const [month, year] = formData.cardExpiry.split('/')
    if (month && year) {
      const expMonth = parseInt(month, 10)
      const expYear = parseInt('20' + year, 10)
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      const currentYear = currentDate.getFullYear()

      if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        alert("Card has expired. Please enter a valid expiry date.")
        return
      }

      if (expMonth < 1 || expMonth > 12) {
        alert("Invalid month. Please enter a month between 01 and 12.")
        return
      }
    }

    try {
      // TEMP mock fraud result
      const outcomes = ["completed", "review", "declined"]
      const txStatus = outcomes[Math.floor(Math.random() * outcomes.length)]

      // Save transaction
      const txnRef = doc(db, "transactions", crypto.randomUUID())
      await setDoc(txnRef, {
        customerEmail: formData.email,
        customerName: formData.name,
        phone: formData.phone,
        cnic: formData.cnic,
        billingAddress: formData.billingAddress,
        shippingAddress: formData.shippingAddress,
        cardNumber: formData.cardNumber,
        amount: formData.amount,
        status: txStatus,
        paymentLinkId: linkCode,
        createdAt: serverTimestamp()
      })

      // Create/update customer
      const custRef = doc(db, "customers", formData.email)
      await setDoc(
        custRef,
        {
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          totalTransactions: increment(1),
          lastTransactionAt: serverTimestamp(),
          flagged: txStatus === "declined"
        },
        { merge: true }
      )

      // Mark payment link as used
      const linkRef = doc(db, "payment_links", linkCode)
      await updateDoc(linkRef, {
        used: true,
        usedAt: serverTimestamp(),
        status: "used"
      })

      setStatus(txStatus)
    } catch (error) {
      console.error(error)
      alert("Failed to process payment")
    }
  }

  // Show loading state
  if (linkStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-xl shadow-md p-8 text-center w-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Verifying payment link...</p>
        </div>
      </div>
    )
  }

  // Show error state for invalid/expired links
  if (linkStatus === "invalid" || linkStatus === "expired" || linkStatus === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-xl shadow-md p-8 text-center w-96">
          <XCircle className="mx-auto mb-4 text-red-600" size={40} />
          <h2 className="text-xl font-semibold text-red-600">Link Unavailable</h2>
          <p className="text-slate-500 mt-2">{linkError}</p>
        </div>
      </div>
    )
  }

  if (status !== "form") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-xl shadow-md p-8 text-center w-96">
          <ShieldCheck className="mx-auto mb-4 text-blue-600" size={40} />

          {status === "completed" && (
            <>
              <h2 className="text-xl font-semibold text-green-600">Payment Successful</h2>
              <p className="text-slate-500 mt-2">
                Your transaction has been completed.
              </p>
            </>
          )}

          {status === "review" && (
            <>
              <h2 className="text-xl font-semibold text-yellow-600">Under Review</h2>
              <p className="text-slate-500 mt-2">
                Your transaction is being reviewed.
              </p>
            </>
          )}

          {status === "declined" && (
            <>
              <h2 className="text-xl font-semibold text-red-600">Payment Declined</h2>
              <p className="text-slate-500 mt-2">
                This transaction could not be processed.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900">Payment Details</h1>
          <p className="text-slate-500 mt-1">Enter your information to complete the payment</p>
        </div>

        <form onSubmit={handlePay} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Phone</label>
              <input
                type="text"
                name="phone"
                placeholder="Phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">CNIC</label>
              <input
                type="text"
                name="cnic"
                placeholder="CNIC"
                value={formData.cnic}
                onChange={handleInputChange}
                className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Billing Address</label>
            <input
              type="text"
              name="billingAddress"
              placeholder="Billing Address"
              value={formData.billingAddress}
              onChange={handleInputChange}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Shipping Address</label>
            <input
              type="text"
              name="shippingAddress"
              placeholder="Shipping Address"
              value={formData.shippingAddress}
              onChange={handleInputChange}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-700">
              <CreditCard size={18} />
              <div className="text-sm font-semibold">Card Details (Simulated)</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Card Number</label>
              <input
                type="text"
                name="cardNumber"
                placeholder="4242 4242 4242 4242"
                value={formData.cardNumber}
                onChange={handleInputChange}
                className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Expiry</label>
                <input
                  type="text"
                  name="cardExpiry"
                  placeholder="MM/YY"
                  value={formData.cardExpiry}
                  onChange={handleExpiryChange}
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                  required
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">CVV</label>
                <input
                  type="text"
                  name="cardCvv"
                  placeholder="***"
                  value={formData.cardCvv}
                  onChange={handleInputChange}
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-sm hover:opacity-90"
            >
              Pay Now
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
