import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { StatoBadge } from '../common/Badge'
import { ConfirmModal } from '../common/Modal'
import CantiereForm from './CantiereForm'
import { formatDate } from '../../utils/dateUtils'
import toast from 'react-hot-toast'

export default function CantieriCompletati() {
  const { state, dispatch } = useApp()
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [duplicateCantiere, setDuplicateCantiere] = useState(null)

  const completati = state.cantieri
    .filter(c => c.stato === 'completato')
    .filter(c => !search || c.nome.toLowerCase().includes(search.toLowerCase()) || c.cliente.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.dataCreazione) - new Date(a.dataCreazione))

  const handleDuplica = (cantiere) => {
    dispatch({ type: 'DUPLICATE_CANTIERE', payload: cantiere.id })
    toast.success(`"${cantiere.nome}" duplicato come nuovo cantiere accettato`)
  }

  const handleRiapri = (cantiere) => {
    dispatch({ type: 'CHANGE_STATO_CANTIERE', payload: { id: cantiere.id, nuovoStato: 'cantierizzato' } })
    toast.success(`"${cantiere.nome}" riaperto come cantierizzato`)
  }

  const totalRevenue = completati.reduce((sum, c) => sum + (Number(c.importoStimato) || 0), 0)
  const totalAttivita = completati.reduce((sum, c) => sum + state.attivita.filter(a => a.cantiereId === c.id).length, 0)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cantieri Completati</h1>
          <p className="text-sm text-gray-500 mt-0.5">Storico lavori conclusi</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">{completati.length} cantieri</div>
          {totalRevenue > 0 && (
            <div className="text-base font-bold text-green-700">€ {totalRevenue.toLocaleString('it-IT')}</div>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {completati.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
            <div className="text-2xl font-bold text-green-700">{completati.length}</div>
            <div className="text-xs text-green-600">Cantieri completati</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
            <div className="text-2xl font-bold text-blue-700">{totalAttivita}</div>
            <div className="text-xs text-blue-600">Attività totali</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
            <div className="text-lg font-bold text-emerald-700">
              {totalRevenue > 0 ? `€ ${totalRevenue.toLocaleString('it-IT')}` : '—'}
            </div>
            <div className="text-xs text-emerald-600">Revenue totale</div>
          </div>
        </div>
      )}

      <div className="mb-4 max-w-sm">
        <input className="input" placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {completati.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
          <span className="text-4xl mb-2">✅</span>
          <p className="font-medium">{search ? 'Nessun cantiere trovato' : 'Nessun cantiere completato'}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {completati.map(cantiere => {
          const attivitaCantiere = state.attivita.filter(a => a.cantiereId === cantiere.id)
          const macroObbligatorie = cantiere.macrocategorie?.filter(m => m.obbligatoria).length || 0
          const macroCompletate = new Set(
            attivitaCantiere.filter(a => a.macrocategoriaId).map(a => a.macrocategoriaId)
          ).size

          return (
            <div key={cantiere.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">{cantiere.nome}</h3>
                      <StatoBadge stato={cantiere.stato} />
                    </div>
                    <p className="text-sm text-gray-500">{cantiere.cliente || '—'}</p>
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span className="text-gray-400">Accettato:</span>
                    <span>{formatDate(cantiere.dataAccettazione)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span className="text-gray-400">Importo:</span>
                    <span className="font-medium text-green-700">
                      {cantiere.importoStimato ? `€ ${Number(cantiere.importoStimato).toLocaleString('it-IT')}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span className="text-gray-400">Attività:</span>
                    <span>{attivitaCantiere.length}</span>
                  </div>
                  {macroObbligatorie > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span className="text-gray-400">Lavorazioni:</span>
                      <span className={macroCompletate >= macroObbligatorie ? 'text-green-600' : 'text-amber-600'}>
                        {Math.min(macroCompletate, macroObbligatorie)}/{macroObbligatorie}
                      </span>
                    </div>
                  )}
                </div>

                {cantiere.note && (
                  <p className="mt-2 text-xs text-gray-400 bg-gray-50 rounded p-2 line-clamp-2">{cantiere.note}</p>
                )}
              </div>

              {/* Read-only macrocategorie list */}
              {cantiere.macrocategorie?.length > 0 && (
                <div className="px-4 pb-3">
                  <div className="flex flex-wrap gap-1">
                    {cantiere.macrocategorie.slice(0, 5).map(m => {
                      const coperta = state.attivita.some(a => a.cantiereId === cantiere.id && a.macrocategoriaId === m.id)
                      return (
                        <span key={m.id} className={`text-xs px-2 py-0.5 rounded-full ${
                          coperta ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {m.nome}
                        </span>
                      )
                    })}
                    {cantiere.macrocategorie.length > 5 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        +{cantiere.macrocategorie.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="px-4 pb-3 border-t border-gray-100 pt-2 flex gap-2">
                <button
                  onClick={() => handleDuplica(cantiere)}
                  className="flex-1 btn-secondary btn-sm"
                  title="Crea un nuovo cantiere copiando questo"
                >
                  📋 Duplica
                </button>
                <button
                  onClick={() => handleRiapri(cantiere)}
                  className="btn-secondary btn-sm"
                  title="Riapri come cantierizzato"
                >
                  🔄 Riapri
                </button>
                <button
                  onClick={() => setConfirmDelete(cantiere)}
                  className="btn-danger btn-sm"
                >
                  ×
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          dispatch({ type: 'DELETE_CANTIERE', payload: confirmDelete.id })
          toast.success(`"${confirmDelete.nome}" eliminato dallo storico`)
        }}
        title="Elimina dallo storico"
        message={`Eliminare definitivamente "${confirmDelete?.nome}" dallo storico? Le attività associate verranno eliminate.`}
        danger
      />
    </div>
  )
}
