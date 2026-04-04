import { useParams } from "react-router-dom"
import { useState, useEffect } from "react"
import { CreditCard, ShieldCheck, XCircle } from "lucide-react"
import { doc, getDoc, setDoc, increment, serverTimestamp, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { predictFraud } from "@/services/fraud.service"

export default function PaymentPage() {
  const { linkCode } = useParams()
  const [status, setStatus] = useState("form")
  const [linkStatus, setLinkStatus] = useState("loading")
  const [linkError, setLinkError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    dob: "",
    category: "grocery_pos",
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
        console.log("Payment link data fetched:", linkData)

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

        // Set the amount from the payment link
        setFormData(prev => ({
          ...prev,
          amount: linkData.amount || 100
        }))
        console.log("Payment amount set from link:", linkData.amount)

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

  // Get user's geolocation
  const getUserLocation = async () => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              long: position.coords.longitude
            })
          },
          () => {
            // Fallback to billing address geocoding
            resolve({ lat: 40.7128, long: -74.0060 })
          }
        )
      } else {
        resolve({ lat: 40.7128, long: -74.0060 })
      }
    })
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
      // Extract city name from billing address (handle various formats)
      const billingParts = formData.billingAddress.split(",")
      let cityName = "Unknown"

      if (billingParts.length >= 2) {
        // Try last part first (often has city name)
        const lastPart = billingParts[billingParts.length - 1].trim().toLowerCase()
        // If last part looks like a city (not a PIN code or number)
        if (isNaN(lastPart) && lastPart.length > 2) {
          cityName = lastPart
        } else if (billingParts.length >= 3) {
          // Try second-to-last part
          cityName = billingParts[billingParts.length - 2].trim().toLowerCase()
        }
      }

      console.log("Extracted city name:", cityName)

      // Fetch user's IP address
      let userIpAddress = null
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json')
        const ipData = await ipResponse.json()
        userIpAddress = ipData.ip
        console.log("User IP Address:", userIpAddress)
      } catch (error) {
        console.error("Error fetching IP:", error)
      }

      // Build ML payload with actual IP address
      const mlPayload = {
        amt: formData.amount,
        category: formData.category,
        gender: formData.gender === "M" ? "M" : "F",
        dob: formData.dob,
        city_name: cityName,
        lat: 0,  // Will be overridden by backend APIs
        long: 0,  // Will be overridden by backend APIs
        merch_lat: 40.7580, // Merchant location
        merch_long: -73.9855, // Merchant location
        trans_date_trans_time: new Date().toISOString(),
        card_number: formData.cardNumber,
        customer_email: formData.email,
        customer_name: formData.name,
        ip_address: userIpAddress  // User's actual IP for geolocation
      }
      console.log("ML Payload being sent:", mlPayload)

      // Call ML fraud detection API
      let mlResult
      try {
        mlResult = await predictFraud(mlPayload)
        console.log("ML API Response:", mlResult)
        console.log("IP Latitude:", mlResult.ip_latitude, "| IP Longitude:", mlResult.ip_longitude)
        console.log("City Population:", mlResult.city_population, "| City:", mlResult.city_name)
      } catch (error) {
        console.error("ML API failed, defaulting to completed:", error)
        mlResult = { fraud: false, confidence: 0 }
      }

      // Decision logic: ML + Rules
      let txStatus = "completed"
      let mlConfidence = mlResult.confidence || 0

      // Only decline if high confidence fraud (> 0.8)
      if (mlResult.fraud && mlConfidence > 0.8) {
        console.log("HIGH confidence fraud detected - DECLINING")
        txStatus = "declined"
      } else {
        // All other cases (low fraud or no fraud) → Completed
        txStatus = "completed"
      }

      // Rule-based overrides
      if (formData.billingAddress !== formData.shippingAddress) {
        // Different addresses - increase scrutiny
        if (txStatus === "completed") {
          txStatus = "review"
        }
      }

      // Save transaction with ML confidence and geolocation data (both IP and City)
      const txnRef = doc(db, "transactions", crypto.randomUUID())
      const transactionData = {
        paymentLinkId: linkCode,
        customerEmail: formData.email,
        customerName: formData.name,
        phone: formData.phone,
        billingAddress: formData.billingAddress,
        shippingAddress: formData.shippingAddress,
        cardNumber: formData.cardNumber,
        cardLast4: mlResult.card_last_4 || formData.cardNumber.slice(-4),
        amount: formData.amount,
        status: txStatus,
        mlConfidence: mlConfidence,
        originalScore: mlResult.original_score || mlConfidence,
        mlFraud: mlResult.fraud,
        ipLocation: mlResult.ip_location || "Unknown",
        ipLatitude: mlResult.ip_latitude || 0,
        ipLongitude: mlResult.ip_longitude || 0,
        cityName: mlResult.city_name || "Unknown",
        cityPopulation: mlResult.city_population || 0,
        cityLatitude: mlResult.city_latitude || 0,
        cityLongitude: mlResult.city_longitude || 0,
        cardVelocityFlag: mlResult.card_velocity_flag || false,
        fraudReasons: mlResult.fraud_reason || [],
        createdAt: serverTimestamp()
      }
      console.log("Transaction data being saved to Firestore:", transactionData)
      await setDoc(txnRef, transactionData)
      console.log("Transaction saved with ID:", txnRef.id, "Status:", txStatus)

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
      console.log("Customer record updated:", formData.email)

      // Mark payment link as used
      const linkRef = doc(db, "payment_links", linkCode)
      await updateDoc(linkRef, {
        used: true,
        usedAt: serverTimestamp(),
        status: "used"
      })
      console.log("Payment link marked as used:", linkCode)

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

        {/* Amount Summary Box */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-600 font-semibold">Payment Amount</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">USD {formData.amount}</p>
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
              <label className="text-sm font-semibold text-slate-700">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="">Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Transaction Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="grocery_pos">Grocery / POS</option>
                <option value="electronics">Electronics</option>
                <option value="travel">Travel</option>
                <option value="shopping_online">Online Shopping</option>
                <option value="fuel_gas_transport">Fuel / Gas Transport</option>
                <option value="restaurants">Restaurants</option>
                <option value="digital_services">Digital Services</option>
                <option value="financial">Financial</option>
              </select>
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
