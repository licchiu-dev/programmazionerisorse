import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { ConfirmModal } from '../common/Modal'
import toast from 'react-hot-toast'

const TIPO_CONFIG = {
  ADD_CANTIERE:        { icon: '➕', color: 'text-green-600 bg-green-50', label: 'Cantiere aggiunto' },
  UPDATE_CANTIERE:     { icon: '✏️', color: 'text-blue-600 bg-blue-50',   label: 'Cantiere modificato' },
  DELETE_CANTIERE:     { icon: '🗑', color: 'text-red-600 bg-red-50',     label: 'Cantiere eliminato' },
  CHANGE_STATO:        { icon: '🔄', color: 'text-purple-600 bg-purple-50', label: 'Stato cambiato' },
  DUPLICATE_CANTIERE:  { icon: '📋', color: 'text-indigo-600 bg-indigo-50', label: 'Cantiere duplicato' },
  ADD_DIPENDENTE:      { icon: '👷', color: 'text-emerald-600 bg-emerald-50', label: 'Dipendente aggiunto' },
  UPDATE_DIPENDENTE:   { icon: '✏️', color: 'text-blue-600 bg-blue-50',   label: 'Dipendente modificato' },
  DELETE_DIPENDENTE:   { icon: '🗑', color: 'text-red-600 bg-red-50',     label: 'Dipendente eliminato' },
  ADD_ATTIVITA:        { icon: '📌', color: 'text-amber-600 bg-amber-50', label: 'Attività aggiunta' },
  UPDATE_ATTIVITA:     { icon: '✏️', color: 'text-blue-600 bg-blue-50',   label: 'Attività modificata' },
  DELETE_ATTIVITA:     { icon: '🗑', color: 'text-red-600 bg-red-50',     label: 'Attività eliminata' },
  UPDATE_SETTINGS:     { icon: '⚙️', color: 'text-gray-600 bg-gray-50',   label: 'Impostazioni' },
  IMPORT:              { icon: '📥', color: 'text-cyan-600 bg-cyan-50',   label: 'Import dati' },
}

const FILTRI = ['Tutti', 'Cantieri', 'Dipendenti', 'Attività', 'Impostazioni']
const TIPO_PER_FILTRO = {
  Cantieri: ['ADD_CANTIERE', 'UPDATE_CANTIERE', 'DELETE_CANTIERE', 'CHANGE_STATO', 'DUPLICATE_CANTIERE'],
  Dipendenti: ['ADD_DIPENDENTE', 'UPDATE_DIPENDENTE', 'DELETE_DIPENDENTE'],
  Attività: ['ADD_ATTIVITA', 'UPDATE_ATTIVITA', 'DELETE_ATTIVITA'],
  Impostazioni: ['UPDATE_SETTINGS', 'IMPORT'],
}

export default function CronologiaAzioni() {
  const { state, dispatch, undo, redo, canUndo, canRedo } = useApp()
  const [filtro, setFiltro] = useState('Tutti')
  const [confirmClear, setConfirmClear] = useState(false)

  const filtered = state.actionLog.filter(a => {
    if (filtro === 'Tutti') return true
    return TIPO_PER_FILTRO[filtro]?.includes(a.tipo)
  })

  const formatTs = (ts) => {
    try {
      const d = new Date(ts)
      return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    } catch { return ts }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Cronologia Azioni</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { undo(); toast('↩ Annullato', { icon: '↩', duration: 1500 }) }}
            disabled={!canUndo}
            className="btn-secondary btn-sm disabled:opacity-40"
            title="Ctrl+Z"
          >
            ↩ Annulla
          </button>
          <button
            onClick={() => { redo(); toast('↪ Ripristinato', { icon: '↪', duration: 1500 }) }}
            disabled={!canRedo}
            className="btn-secondary btn-sm disabled:opacity-40"
            title="Ctrl+Y"
          >
            ↪ Ripristina
          </button>
          {state.actionLog.length > 0 && (
            <button onClick={() => setConfirmClear(true)} className="btn-secondary btn-sm text-red-500">
              Cancella log
            </button>
          )}
        </div>
      </div>

      {/* Filtri */}
      <div className="flex gap-1 flex-wrap">
        {FILTRI.map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filtro === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Log list */}
      {filtered.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">Nessuna azione registrata</div>
      )}

      <div className="space-y-1.5 max-h-96 overflow-y-auto">
        {filtered.map((entry) => {
          const cfg = TIPO_CONFIG[entry.tipo] || { icon: '•', color: 'text-gray-600 bg-gray-50', label: entry.tipo }
          return (
            <div key={entry.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 group">
              <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm shrink-0 ${cfg.color}`}>
                {cfg.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 truncate">{entry.descrizione}</div>
                <div className="text-xs text-gray-400">{cfg.label}</div>
              </div>
              <div className="text-xs text-gray-400 shrink-0">{formatTs(entry.timestamp)}</div>
            </div>
          )
        })}
      </div>

      <ConfirmModal
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => { dispatch({ type: 'CLEAR_LOG' }); toast.success('Log cancellato') }}
        title="Cancellare il log?"
        message="Questa azione cancellerà tutta la cronologia delle modifiche. Non può essere annullata."
        danger
      />
    </div>
  )
}
