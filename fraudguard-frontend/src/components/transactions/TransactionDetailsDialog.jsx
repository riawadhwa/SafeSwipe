import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const formatDateTime = (value) => {
  if (!value) return "—"
  if (typeof value?.toDate === "function") return value.toDate().toLocaleString()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString()
}

export default function TransactionDetailsDialog({
  open,
  onOpenChange,
  transaction,
  onDeleteTransaction,
  deletePending = false,
}) {
  if (!transaction) return null

  const riskReasons = Array.isArray(transaction.riskReasons)
    ? transaction.riskReasons
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="p-3 bg-slate-50 rounded-lg border">
            <p className="text-slate-500">Transaction ID</p>
            <p className="font-medium break-all">{transaction.id}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border">
            <p className="text-slate-500">Payment Link ID</p>
            <p className="font-medium break-all">{transaction.paymentLinkId || "—"}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border">
            <p className="text-slate-500">Status</p>
            <p className="font-medium capitalize">{transaction.status || "—"}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border">
            <p className="text-slate-500">Amount</p>
            <p className="font-medium">{transaction.amount ?? "—"}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border">
            <p className="text-slate-500">Customer</p>
            <p className="font-medium">{transaction.customerName || "—"}</p>
            <p className="text-slate-500 text-xs">{transaction.customerEmail || "—"}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border">
            <p className="text-slate-500">Time</p>
            <p className="font-medium">{formatDateTime(transaction.createdAt)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border">
            <p className="text-slate-500">ML Confidence</p>
            <p className="font-medium">{typeof transaction.mlConfidence === "number" ? transaction.mlConfidence.toFixed(3) : "—"}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border">
            <p className="text-slate-500">Risk Score</p>
            <p className="font-medium">{typeof transaction.riskScore === "number" ? transaction.riskScore.toFixed(3) : "—"}</p>
          </div>
        </div>

        {riskReasons.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-slate-500 mb-2">Risk Reasons</p>
            <div className="flex flex-wrap gap-2">
              {riskReasons.map((reason) => (
                <span key={reason} className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                  {reason}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end border-t pt-4">
          <Button
            type="button"
            variant="destructive"
            onClick={() => onDeleteTransaction?.(transaction)}
            disabled={deletePending}
          >
            {deletePending ? "Deleting..." : "Delete Transaction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
