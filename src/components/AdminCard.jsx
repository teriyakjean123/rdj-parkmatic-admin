export default function AdminCard({
  title,
  value,
  icon: Icon,
  valueColor = "text-slate-800",
  highlightColor = "border-transparent",
  iconBg = "bg-slate-100",
  iconColor = "text-slate-500",
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 p-6 border-b-4 ${highlightColor}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">
            {title}
          </p>
          <h3 className={`text-3xl font-extrabold ${valueColor}`}>{value}</h3>
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${iconBg}`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        )}
      </div>
    </div>
  );
}
