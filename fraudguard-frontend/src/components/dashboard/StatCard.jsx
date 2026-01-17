export default function StatCard({ title, value, icon, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-5 border flex justify-between items-center ${onClick ? "cursor-pointer hover:shadow-lg transition" : ""}`}
    >
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${color}`}>
        {icon}
      </div>
    </div>
  )
}
