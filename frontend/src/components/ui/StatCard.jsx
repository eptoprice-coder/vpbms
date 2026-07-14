const ACCENTS = {
  brand: {
    chip: 'from-brand-500/25 to-brand-500/5 text-brand-600 dark:text-brand-300',
    glow: 'bg-brand-500/15',
    ring: 'group-hover:shadow-[0_0_30px_-8px_rgba(34,197,94,0.5)]',
  },
  green: {
    chip: 'from-brand-500/25 to-brand-500/5 text-brand-600 dark:text-brand-300',
    glow: 'bg-brand-500/15',
    ring: 'group-hover:shadow-[0_0_30px_-8px_rgba(34,197,94,0.5)]',
  },
  orange: {
    chip: 'from-accent-500/25 to-accent-500/5 text-accent-600 dark:text-accent-300',
    glow: 'bg-accent-500/15',
    ring: 'group-hover:shadow-[0_0_30px_-8px_rgba(249,115,22,0.5)]',
  },
  red: {
    chip: 'from-red-500/25 to-red-500/5 text-red-600 dark:text-red-300',
    glow: 'bg-red-500/15',
    ring: 'group-hover:shadow-[0_0_30px_-8px_rgba(239,68,68,0.5)]',
  },
};

export default function StatCard({ icon: Icon, label, value, accent = 'brand', sub, className = '' }) {
  const a = ACCENTS[accent] || ACCENTS.brand;
  return (
    <div className={`group premium-card premium-card-hover p-5 flex flex-col gap-1 ${className}`}>
      {/* corner glow */}
      <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl ${a.glow} opacity-60 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} aria-hidden="true" />

      <div className="relative flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
        {Icon && (
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${a.chip} transition-all duration-300 ${a.ring} group-hover:scale-110`}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="relative text-2xl font-bold mt-1 tabular-nums">{value}</div>
      {sub && <div className="relative text-xs text-gray-400">{sub}</div>}
    </div>
  );
}
