import { useState } from 'react'
import GestioneDipendenti from './GestioneDipendenti'
import CronologiaAzioni from './CronologiaAzioni'
import Statistiche from './Statistiche'
import ImpostazioniGenerali from './ImpostazioniGenerali'

const TABS = [
  { id: 'statistiche',   label: '📊 Statistiche',     component: Statistiche },
  { id: 'dipendenti',    label: '👷 Dipendenti',       component: GestioneDipendenti },
  { id: 'cronologia',    label: '📋 Cronologia',       component: CronologiaAzioni },
  { id: 'impostazioni',  label: '⚙️ Impostazioni',     component: ImpostazioniGenerali },
]

export default function AdminPanel() {
  const [tab, setTab] = useState('statistiche')
  const ActiveComponent = TABS.find(t => t.id === tab)?.component || Statistiche

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Pannello Admin</h1>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors -mb-px ${
              tab === t.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ActiveComponent />
    </div>
  )
}
