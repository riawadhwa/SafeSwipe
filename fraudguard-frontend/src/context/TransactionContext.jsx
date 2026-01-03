import { createContext, useContext, useEffect, useState } from "react"
import { listenToTransactions } from "@/services/transactions.service"

const TransactionContext = createContext()

export const TransactionProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const unsub = listenToTransactions((data) => {
      setTransactions(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  return (
    <TransactionContext.Provider value={{ transactions, loading }}>
      {children}
    </TransactionContext.Provider>
  )
}

export const useTransactions = () => {
  const context = useContext(TransactionContext)
  if (!context) {
    throw new Error("useTransactions must be used within TransactionProvider")
  }
  return context
}
