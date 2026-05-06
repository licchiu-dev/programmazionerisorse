import { useApp } from '../../context/AppContext'
import { supabase, isSupabaseConfigured } from '../../utils/supabase'

const NAV_ITEMS = [
  { id: 'gantt',         label: 'Gantt',             icon: '📅', desc: 'Dashboard principale' },
  { id: 'dipendenti',    label: 'Dipendenti',        icon: '👷', desc: 'Vista per risorsa' },
  { id: 'accettati',     label: 'Non Cantierizzati', icon: '📋', desc: 'Cantieri accettati' },
  { id: 'cantierizzati', label: 'Cantierizzati',     icon: '🏗️', desc: 'In lavorazione' },
  { id: 'completati',    label: 'Completati',        icon: '✅', desc: 'Storico' },
  { id: 'admin',         label: 'Admin',             icon: '⚙️', desc: 'Pannello amministrazione' },
]

const SYNC_CONFIG = {
  idle:    { dot: 'bg-gray-500',   label: 'Cloud sync attivo',  labelClass: 'text-gray-500' },
  syncing: { dot: 'bg-yellow-400 animate-pulse', label: 'Salvataggio…', labelClass: 'text-yellow-400' },
  saved:   { dot: 'bg-green-400',  label: 'Salvato su cloud',   labelClass: 'text-green-400' },
  error:   { dot: 'bg-red-500',    label: 'Errore sync',        labelClass: 'text-red-400' },
  offline: { dot: 'bg-gray-600',   label: 'Locale (no cloud)',  labelClass: 'text-gray-500' },
}

export default function Sidebar({ currentPage, onNavigate }) {
  const { state, conflicts, syncStatus } = useApp()
  const conflictCount = Object.keys(conflicts).length
  const sync = SYNC_CONFIG[syncStatus] || SYNC_CONFIG.offline

  const counts = {
    accettati:     state.cantieri.filter(c => c.stato === 'accettato').length,
    cantierizzati: state.cantieri.filter(c => c.stato === 'cantierizzato').length,
    completati:    state.cantieri.filter(c => c.stato === 'completato').length,
  }

  return (
    <aside className="w-60 min-h-screen bg-gray-900 text-white flex flex-col shadow-xl shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
            PR
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm leading-tight truncate">{state.settings.nomeAzienda}</div>
            <div className="text-xs text-gray-400">Gestione Risorse</div>
          </div>
        </div>
      </div>

      {/* Conflict Alert */}
      {conflictCount > 0 && (
        <div className="mx-3 mt-3 px-3 py-2 bg-red-900/50 border border-red-700 rounded-lg text-xs text-red-300 flex items-center gap-2">
          <span className="text-red-400 shrink-0">⚠</span>
          <span>{conflictCount} conflitt{conflictCount !== 1 ? 'i' : 'o'} rilevat{conflictCount !== 1 ? 'i' : 'o'}</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 mt-2">
        {NAV_ITEMS.map(item => {
          const isActive = currentPage === item.id
          const badge = counts[item.id]
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                isActive
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-lg shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{item.label}</div>
                <div className={`text-xs truncate ${isActive ? 'text-primary-200' : 'text-gray-500'}`}>
                  {item.desc}
                </div>
              </div>
              {badge !== undefined && badge > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center shrink-0 ${
                  isActive ? 'bg-primary-400 text-white' : 'bg-gray-700 text-gray-300'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700 text-xs text-gray-500 space-y-2">
        <div className="flex justify-between">
          <span>Dipendenti</span>
          <span className="font-semibold text-gray-400">{state.dipendenti.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Attività totali</span>
          <span className="font-semibold text-gray-400">{state.attivita.length}</span>
        </div>

        {/* Sync status */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
          <span className={`w-2 h-2 rounded-full shrink-0 ${sync.dot}`} />
          <span className={`text-xs ${sync.labelClass}`}>{sync.label}</span>
        </div>

        {/* Logout */}
        {isSupabaseConfigured() && (
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full mt-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        )}
      </div>
    </aside>
  )
}
