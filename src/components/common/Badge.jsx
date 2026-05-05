const STATO_CONFIG = {
  accettato:     { label: 'Accettato',     cls: 'bg-amber-100 text-amber-800 border border-amber-200' },
  cantierizzato: { label: 'Cantierizzato', cls: 'bg-blue-100 text-blue-800 border border-blue-200' },
  completato:    { label: 'Completato',    cls: 'bg-green-100 text-green-800 border border-green-200' },
}

export function StatoBadge({ stato }) {
  const cfg = STATO_CONFIG[stato] || { label: stato, cls: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

export function ConflictBadge({ count }) {
  if (!count) return null
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      {count} conflitt{count !== 1 ? 'i' : 'o'}
    </span>
  )
}

export function StatCard({ label, value, sub, color = 'blue', icon }) {
  const colors = {
    blue:   'bg-blue-50 border-blue-100 text-blue-600',
    green:  'bg-green-50 border-green-100 text-green-600',
    amber:  'bg-amber-50 border-amber-100 text-amber-600',
    red:    'bg-red-50 border-red-100 text-red-600',
    purple: 'bg-purple-50 border-purple-100 text-purple-600',
    gray:   'bg-gray-50 border-gray-100 text-gray-600',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]} flex items-start gap-3`}>
      {icon && <span className="text-2xl">{icon}</span>}
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm font-medium mt-0.5">{label}</div>
        {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}
