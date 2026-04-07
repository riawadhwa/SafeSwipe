export default function StatCard({ title, value, icon, color, onClick, subtitle, trend }) {
  return (
    <div
      onClick={onClick}
      className={[
        "group rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm transition-all duration-200",
        "flex items-start justify-between gap-4",
        onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg" : "",
      ].join(" ")}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        {trend ? <p className="mt-2 text-xs font-medium text-slate-700">{trend}</p> : null}
      </div>
      <div className={`h-11 w-11 shrink-0 rounded-xl border border-white/60 shadow-sm flex items-center justify-center ${color}`}>
        {icon}
      </div>
    </div>
  )
}
