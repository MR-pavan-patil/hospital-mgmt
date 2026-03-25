export default function StatsCard({ icon: Icon, label, value, trend, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    red: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
    violet: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
  }

  return (
    <div className="card p-5 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-dark-muted font-medium">{label}</p>
          <p className="text-2xl font-bold font-display mt-1 text-gray-900 dark:text-white">{value}</p>
          {trend && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">{trend}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}
