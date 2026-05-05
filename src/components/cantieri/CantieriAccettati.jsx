import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { StatoBadge } from '../common/Badge'
import { ConfirmModal } from '../common/Modal'
import CantiereForm from './CantiereForm'
import { formatDate } from '../../utils/dateUtils'
import toast from 'react-hot-toast'

export default function CantieriAccettati() {
  const { state, dispatch } = useApp()
  const [formOpen, setFormOpen] = useState(false)
  const [editCantiere, setEditCantiere] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [search, setSearch] = useState('')

  const accettati = state.cantieri
    .filter(c => c.stato === 'accettato')
    .filter(c =>
      !search ||
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.cliente.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.dataCreazione) - new Date(a.dataCreazione))

  const handleSposta = (cantiere, nuovoStato) => {
    dispatch({ type: 'CHANGE_STATO_CANTIERE', payload: { id: cantiere.id, nuovoStato } })
    const labels = { cantierizzato: 'Cantierizzato', completato: 'Completato' }
    toast.success(`"${cantiere.nome}" spostato in ${labels[nuovoStato]}`)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cantieri Non Cantierizzati</h1>
          <p className="text-sm text-gray-500 mt-0.5">Commesse accettate non ancora avviate</p>
        </div>
        <button onClick={() => { setEditCantiere(null); setFormOpen(true) }} className="btn-primary">
          + Nuovo Cantiere
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 max-w-sm">
        <input
          className="input"
          placeholder="Cerca per nome o cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Empty state */}
      {accettati.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
          <span className="text-4xl mb-2">📋</span>
          <p className="font-medium">{search ? 'Nessun cantiere trovato' : 'Nessun cantiere accettato'}</p>
          {!search && <p className="text-sm mt-1">Clicca "+ Nuovo Cantiere" per iniziare</p>}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accettati.map(cantiere => (
          <div key={cantiere.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="p-4 flex-1">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{cantiere.nome || '(senza nome)'}</h3>
                  <p className="text-sm text-gray-500 truncate">{cantiere.cliente || '—'}</p>
                </div>
                <StatoBadge stato={cantiere.stato} />
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span className="text-gray-400">Accettato:</span>
                  <span>{formatDate(cantiere.dataAccettazione)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Importo:</span>
                  <span className="font-medium text-green-700">
                    {cantiere.importoStimato ? `€ ${Number(cantiere.importoStimato).toLocaleString('it-IT')}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Lavorazioni:</span>
                  <span>{cantiere.macrocategorie?.length || 0}</span>
                </div>
              </div>

              {cantiere.note && (
                <p className="mt-2 text-xs text-gray-400 bg-gray-50 rounded p-2 line-clamp-2">{cantiere.note}</p>
              )}
            </div>

            {/* Actions */}
            <div className="px-4 pb-3 pt-2 border-t border-gray-100 flex gap-2 flex-wrap">
              <button
                onClick={() => handleSposta(cantiere, 'cantierizzato')}
                className="flex-1 btn-primary btn-sm"
                title="Avvia il cantiere e aggiungilo al Gantt"
              >
                🏗️ Cantierizza
              </button>
              <button
                onClick={() => { setEditCantiere(cantiere); setFormOpen(true) }}
                className="btn-secondary btn-sm"
              >
                Modifica
              </button>
              <button
                onClick={() => setConfirmDelete(cantiere)}
                className="btn-danger btn-sm"
              >
                Elimina
              </button>
            </div>
          </div>
        ))}
      </div>

      <CantiereForm
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditCantiere(null) }}
        cantiere={editCantiere}
        statoDefault="accettato"
      />

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          dispatch({ type: 'DELETE_CANTIERE', payload: confirmDelete.id })
          toast.success(`"${confirmDelete.nome}" eliminato`)
        }}
        title="Elimina cantiere"
        message={`Sei sicuro di voler eliminare "${confirmDelete?.nome}"? Verranno eliminate anche tutte le attività associate.`}
        danger
      />
    </div>
  )
}
