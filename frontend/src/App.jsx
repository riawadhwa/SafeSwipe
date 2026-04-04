import { BrowserRouter, Routes, Route } from "react-router-dom"
import { TransactionProvider } from "./context/TransactionContext"
import Auth from "./pages/Auth"
import Dashboard from "./pages/Dashboard"
import Customers from "./pages/Customers"
import Fraudulent from "./pages/Fraudulent"
import PaymentLinks from "./pages/PaymentLinks"
import PaymentPage from "./pages/PaymentPage"

export default function App() {
  return (
    <BrowserRouter>
      <TransactionProvider>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/fraudulent" element={<Fraudulent />} />
          <Route path="/payment-links" element={<PaymentLinks />} />
          <Route path="/pay/:linkCode" element={<PaymentPage />} />
        </Routes>
      </TransactionProvider>
    </BrowserRouter>
  )
}
