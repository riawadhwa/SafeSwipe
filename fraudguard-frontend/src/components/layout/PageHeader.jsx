export default function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-6 animate-enter">
      <div className="mb-2 h-1 w-16 rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500" />
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      )}
    </div>
  )
}
