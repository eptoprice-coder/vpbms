export default function StatCard({ icon: Icon, label, value, accent = 'brand', sub }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
        {Icon && (
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center bg-${accent}-100 dark:bg-${accent}-900/40 text-${accent}-600 dark:text-${accent}-300`}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}
