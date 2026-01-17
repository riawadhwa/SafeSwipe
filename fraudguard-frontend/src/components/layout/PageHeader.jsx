export default function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle && (
        <p className="text-sm text-gray-500">{subtitle}</p>
      )}
    </div>
  )
}
