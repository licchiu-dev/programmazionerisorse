import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { StatoBadge, ConflictBadge } from '../common/Badge'
import { ConfirmModal } from '../common/Modal'
import CantiereForm from './CantiereForm'
import { attivitaHasConflict } from '../../utils/conflicts'
import { formatDate } from '../../utils/dateUtils'
import toast from 'react-hot-toast'

function CompletenessCheck({ cantiere, attivita, onNavigateGantt }) {
  const macroObbligatorie = cantiere.macrocategorie?.filter(m => m.obbligatoria) || []
  const macroConAttivita = new Set(
    attivita.filter(a => a.cantiereId === cantiere.id && a.macrocategoriaId).map(a => a.macrocategoriaId)
  )
  const mancanti = macroObbligatorie.filter(m => !macroConAttivita.has(m.id))
  const coperte = macroObbligatorie.length - mancanti.length
  const pct = macroObbligatorie.length > 0 ? Math.round((coperte / macroObbligatorie.length) * 100) : 100

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Completezza lavorazioni</span>
        <span className={`font-semibold ${pct === 100 ? 'text-green-600' : pct > 50 ? 'text-amber-600' : 'text-red-600'}`}>
          {coperte}/{macroObbligatorie.length} ({pct}%)
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-amber-400' : 'bg-red-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {mancanti.length > 0 && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded p-2">
          <span className="font-medium">Mancanti: </span>
          {mancanti.map(m => m.nome).join(', ')}
        </div>
      )}
    </div>
  )
}

export default function CantieriCantierizzati({ onNavigateGantt }) {
  const { state, dispatch, conflicts } = useApp()
  const [formOpen, setFormOpen] = useState(false)
  const [editCantiere, setEditCantiere] = useState(null)
  const [confirmMove, setConfirmMove] = useState(null)
  const [confirmBack, setConfirmBack] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [search, setSearch] = useState('')

  const cantierizzati = state.cantieri
    .filter(c => c.stato === 'cantierizzato')
    .filter(c => !search || c.nome.toLowerCase().includes(search.toLowerCase()) || c.cliente.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.dataCreazione) - new Date(a.dataCreazione))

  const checkCanComplete = (cantiere) => {
    const macroObbligatorie = cantiere.macrocategorie?.filter(m => m.obbligatoria) || []
    const macroConAttivita = new Set(
      state.attivita.filter(a => a.cantiereId === cantiere.id && a.macrocategoriaId).map(a => a.macrocategoriaId)
    )
    return macroObbligatorie.every(m => macroConAttivita.has(m.id))
  }

  const handleCompleta = (cantiere, forza = false) => {
    if (!forza && !checkCanComplete(cantiere)) {
      setConfirmMove({ cantiere, forzato: true })
      return
    }
    dispatch({ type: 'CHANGE_STATO_CANTIERE', payload: { id: cantiere.id, nuovoStato: 'completato' } })
    toast.success(`"${cantiere.nome}" completato!`)
    setConfirmMove(null)
  }

  const getConflictsForCantiere = (cantiereId) => {
    const attivitaIds = state.attivita.filter(a => a.cantiereId === cantiereId).map(a => a.id)
    return Object.values(conflicts).flat().filter(id => attivitaIds.includes(id)).length > 0
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cantieri Cantierizzati</h1>
          <p className="text-sm text-gray-500 mt-0.5">Commesse in lavorazione — visibili nel Gantt</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onNavigateGantt} className="btn-secondary">📅 Vai al Gantt</button>
          <button onClick={() => { setEditCantiere(null); setFormOpen(true) }} className="btn-primary">+ Nuovo</button>
        </div>
      </div>

      <div className="mb-4 max-w-sm">
        <input className="input" placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {cantierizzati.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
          <span className="text-4xl mb-2">🏗️</span>
          <p className="font-medium">{search ? 'Nessun cantiere trovato' : 'Nessun cantiere attivo'}</p>
          {!search && <p className="text-sm mt-1">Sposta un cantiere "Accettato" in Cantierizzato</p>}
        </div>
      )}

      <div className="space-y-4">
        {cantierizzati.map(cantiere => {
          const attivitaCantiere = state.attivita.filter(a => a.cantiereId === cantiere.id)
          const hasConflict = getConflictsForCantiere(cantiere.id)
          const isExpanded = expandedId === cantiere.id
          const canComplete = checkCanComplete(cantiere)

          return (
            <div key={cantiere.id} className="bg-white rounded-xl border border-gray-200 shadow-sm">
              {/* Header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{cantiere.nome}</h3>
                      <StatoBadge stato={cantiere.stato} />
                      {hasConflict && <ConflictBadge count={1} />}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{cantiere.cliente}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-green-700">
                      {cantiere.importoStimato ? `€ ${Number(cantiere.importoStimato).toLocaleString('it-IT')}` : '—'}
                    </div>
                    <div className="text-xs text-gray-400">{attivitaCantiere.length} attività</div>
                  </div>
                </div>

                <CompletenessCheck cantiere={cantiere} attivita={state.attivita} />

                {/* Dipendenti assegnati */}
                {cantiere.risorsePermesse?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {cantiere.risorsePermesse.map(dipId => {
                      const dip = state.dipendenti.find(d => d.id === dipId)
                      if (!dip) return null
                      return (
                        <span
                          key={dipId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ background: dip.colore }}
                        >
                          {dip.nome} {dip.cognome}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Expanded: macrocategorie */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Macrocategorie</h4>
                  <div className="grid grid-cols-2 gap-1">
                    {cantiere.macrocategorie?.map(m => {
                      const coperta = state.attivita.some(a => a.cantiereId === cantiere.id && a.macrocategoriaId === m.id)
                      return (
                        <div key={m.id} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                          coperta ? 'text-green-700 bg-green-50' : m.obbligatoria ? 'text-amber-700 bg-amber-50' : 'text-gray-500 bg-gray-50'
                        }`}>
                          <span>{coperta ? '✓' : m.obbligatoria ? '!' : '○'}</span>
                          <span className="truncate">{m.nome}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="px-4 pb-3 pt-2 border-t border-gray-100 flex gap-2 flex-wrap">
                <button
                  onClick={() => handleCompleta(cantiere)}
                  className={`flex-1 btn-sm ${canComplete ? 'btn-primary' : 'btn-secondary'}`}
                  title={canComplete ? 'Tutte le lavorazioni sono coperte' : 'Alcune lavorazioni obbligatorie mancano'}
                >
                  {canComplete ? '✅ Completa' : '⚠ Completa (incompleto)'}
                </button>
                <button onClick={() => setExpandedId(isExpanded ? null : cantiere.id)} className="btn-secondary btn-sm">
                  {isExpanded ? '▲' : '▼'} Dettagli
                </button>
                <button onClick={() => { setEditCantiere(cantiere); setFormOpen(true) }} className="btn-secondary btn-sm">
                  Modifica
                </button>
                <button
                  onClick={() => setConfirmBack(cantiere)}
                  className="btn-secondary btn-sm text-amber-600 border-amber-200 hover:bg-amber-50"
                  title="Riporta a Non Cantierizzato"
                >
                  ↩ Non Cant.
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <CantiereForm
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditCantiere(null) }}
        cantiere={editCantiere}
        statoDefault="cantierizzato"
      />

      {/* Confirm completamento forzato */}
      {confirmMove?.forzato && (
        <ConfirmModal
          isOpen
          onClose={() => setConfirmMove(null)}
          onConfirm={() => handleCompleta(confirmMove.cantiere, true)}
          title="Completare con lavorazioni mancanti?"
          message="Alcune macrocategorie obbligatorie non sono ancora coperte da attività. Vuoi completare ugualmente?"
          danger
        />
      )}

      {/* Confirm riportare a non cantierizzato */}
      <ConfirmModal
        isOpen={!!confirmBack}
        onClose={() => setConfirmBack(null)}
        onConfirm={() => {
          dispatch({ type: 'CHANGE_STATO_CANTIERE', payload: { id: confirmBack.id, nuovoStato: 'accettato' } })
          toast.success(`"${confirmBack.nome}" riportato a Non Cantierizzato`)
        }}
        title="Riportare a Non Cantierizzato?"
        message={`"${confirmBack?.nome}" verrà rimosso dal Gantt. Le attività assegnate rimarranno salvate.`}
      />
    </div>
  )
}
