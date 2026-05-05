import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import Modal, { ConfirmModal } from '../common/Modal'
import { getConflictsForDipendente } from '../../utils/conflicts'
import { formatDate } from '../../utils/dateUtils'
import toast from 'react-hot-toast'

const SPECIALIZZAZIONI = [
  'Muratore', 'Carpentiere', 'Elettricista', 'Idraulico', 'Imbianchino',
  'Piastrellista', 'Ferraiolo', 'Gruista', 'Geometra', 'Caposquadra',
  'Saldatore', 'Lattoniere', 'Pavimentista', 'Pittore', 'Giardiniere'
]

function DipendentForm({ isOpen, onClose, dipendente }) {
  const { state, dispatch } = useApp()
  const isNew = !dipendente?.id
  const usedColors = state.dipendenti.filter(d => !dipendente || d.id !== dipendente.id).map(d => d.colore)
  const availColor = state.settings.coloriDipendenti.find(c => !usedColors.includes(c)) || '#6366f1'

  const [form, setForm] = useState(() => ({
    nome: dipendente?.nome || '',
    cognome: dipendente?.cognome || '',
    specializzazioni: dipendente?.specializzazioni || [],
    colore: dipendente?.colore || availColor,
    dataAssunzione: dipendente?.dataAssunzione || new Date().toISOString().split('T')[0],
  }))

  const handleSave = () => {
    if (!form.nome.trim() || !form.cognome.trim()) {
      toast.error('Inserisci nome e cognome')
      return
    }
    if (isNew) {
      dispatch({ type: 'ADD_DIPENDENTE', payload: form })
      toast.success('Dipendente aggiunto')
    } else {
      dispatch({ type: 'UPDATE_DIPENDENTE', payload: { id: dipendente.id, data: form } })
      toast.success('Dipendente aggiornato')
    }
    onClose()
  }

  const toggleSpec = (s) => setForm(f => ({
    ...f,
    specializzazioni: f.specializzazioni.includes(s)
      ? f.specializzazioni.filter(x => x !== s)
      : [...f.specializzazioni, s]
  }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isNew ? 'Nuovo Dipendente' : 'Modifica Dipendente'}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Annulla</button>
          <button onClick={handleSave} className="btn-primary">{isNew ? 'Aggiungi' : 'Salva'}</button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Nome *</label>
            <input className="input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="label">Cognome *</label>
            <input className="input" value={form.cognome} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="label">Data assunzione</label>
          <input type="date" className="input" value={form.dataAssunzione} onChange={e => setForm(f => ({ ...f, dataAssunzione: e.target.value }))} />
        </div>

        <div>
          <label className="label">Colore nel Gantt</label>
          <div className="flex flex-wrap gap-2">
            {state.settings.coloriDipendenti.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setForm(f => ({ ...f, colore: c }))}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${form.colore === c ? 'border-gray-800 scale-125' : 'border-transparent hover:scale-110'}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="label">Specializzazioni</label>
          <div className="flex flex-wrap gap-1.5">
            {SPECIALIZZAZIONI.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpec(s)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  form.specializzazioni.includes(s)
                    ? 'bg-primary-100 border-primary-300 text-primary-700 font-medium'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function GestioneDipendenti() {
  const { state, dispatch, conflicts } = useApp()
  const [formOpen, setFormOpen] = useState(false)
  const [editDip, setEditDip] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const dipendenti = state.dipendenti

  const getCarico = (dipId) => {
    return state.attivita.filter(a => a.dipendentiIds.includes(dipId)).length
  }

  const getDipConflicts = (dipId) => getConflictsForDipendente(dipId, conflicts)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Dipendenti / Risorse</h2>
        <button onClick={() => { setEditDip(null); setFormOpen(true) }} className="btn-primary btn-sm">
          + Aggiungi
        </button>
      </div>

      {dipendenti.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <span className="text-3xl block mb-2">👷</span>
          <p>Nessun dipendente. Aggiungine uno!</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {dipendenti.map(dip => {
          const carico = getCarico(dip.id)
          const conflitti = getDipConflicts(dip.id)
          const attivitaCantieri = new Set(state.attivita.filter(a => a.dipendentiIds.includes(dip.id)).map(a => a.cantiereId)).size

          return (
            <div key={dip.id} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3">
              {/* Avatar */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
                style={{ background: dip.colore }}
              >
                {dip.nome[0]}{dip.cognome[0]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{dip.nome} {dip.cognome}</div>
                    <div className="text-xs text-gray-400">Dal {formatDate(dip.dataAssunzione)}</div>
                  </div>
                  {conflitti.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                      ⚠ {conflitti.length} conf.
                    </span>
                  )}
                </div>

                {dip.specializzazioni?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {dip.specializzazioni.map(s => (
                      <span key={s} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{s}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span>{carico} attività</span>
                  <span>{attivitaCantieri} cantieri</span>
                </div>

                {/* Conflitti dettaglio */}
                {conflitti.length > 0 && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 rounded p-1.5">
                    Conflitti: {conflitti.slice(0, 3).map(c => c.data).join(', ')}
                    {conflitti.length > 3 && ` +${conflitti.length - 3} altri`}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => { setEditDip(dip); setFormOpen(true) }} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 hover:bg-gray-100 rounded">
                  Modifica
                </button>
                <button onClick={() => setConfirmDelete(dip)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 hover:bg-red-50 rounded">
                  Elimina
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <DipendentForm
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditDip(null) }}
        dipendente={editDip}
      />

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          dispatch({ type: 'DELETE_DIPENDENTE', payload: confirmDelete.id })
          toast.success(`"${confirmDelete.nome} ${confirmDelete.cognome}" eliminato`)
        }}
        title="Elimina dipendente"
        message={`Eliminare "${confirmDelete?.nome} ${confirmDelete?.cognome}"? Verrà rimosso da tutte le attività e i cantieri.`}
        danger
      />
    </div>
  )
}
