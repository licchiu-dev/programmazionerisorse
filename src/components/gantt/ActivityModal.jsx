import { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { useApp } from '../../context/AppContext'
import toast from 'react-hot-toast'
import { ConfirmModal } from '../common/Modal'

export default function ActivityModal({ isOpen, onClose, attivita, cantiereId, dataInizio, dataFine }) {
  const { state, dispatch } = useApp()
  const isNew = !attivita?.id

  const [form, setForm] = useState({
    nome: '',
    cantiereId: cantiereId || '',
    dipendentiIds: [],
    macrocategoriaId: '',
    dataInizio: dataInizio || new Date().toISOString().split('T')[0],
    dataFine: dataFine || new Date().toISOString().split('T')[0],
    note: '',
  })
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  useEffect(() => {
    if (attivita) {
      setForm({
        nome: attivita.nome || '',
        cantiereId: attivita.cantiereId || cantiereId || '',
        dipendentiIds: attivita.dipendentiIds || [],
        macrocategoriaId: attivita.macrocategoriaId || '',
        dataInizio: attivita.dataInizio || dataInizio || '',
        dataFine: attivita.dataFine || dataFine || '',
        note: attivita.note || '',
      })
    } else {
      setForm(f => ({
        ...f,
        cantiereId: cantiereId || '',
        dataInizio: dataInizio || f.dataInizio,
        dataFine: dataFine || f.dataFine,
      }))
    }
  }, [attivita, cantiereId, dataInizio, dataFine, isOpen])

  const cantierizzati = state.cantieri.filter(c => c.stato === 'cantierizzato')
  const cantiere = state.cantieri.find(c => c.id === form.cantiereId)
  const risorseDisponibili = cantiere?.risorsePermesse?.length > 0
    ? state.dipendenti.filter(d => cantiere.risorsePermesse.includes(d.id))
    : state.dipendenti

  const handleSave = () => {
    if (!form.nome.trim()) { toast.error('Inserisci un nome per l\'attività'); return }
    if (!form.cantiereId) { toast.error('Seleziona un cantiere'); return }
    if (!form.dataInizio || !form.dataFine) { toast.error('Inserisci le date'); return }
    if (form.dataFine < form.dataInizio) { toast.error('La data fine deve essere dopo l\'inizio'); return }

    if (isNew) {
      dispatch({ type: 'ADD_ATTIVITA', payload: { ...form } })
      toast.success('Attività aggiunta')
    } else {
      dispatch({ type: 'UPDATE_ATTIVITA', payload: { id: attivita.id, data: form } })
      toast.success('Attività aggiornata')
    }
    onClose()
  }

  const handleDelete = () => {
    dispatch({ type: 'DELETE_ATTIVITA', payload: attivita.id })
    toast.success('Attività eliminata')
    onClose()
  }

  const toggleDipendente = (id) => {
    setForm(f => ({
      ...f,
      dipendentiIds: f.dipendentiIds.includes(id)
        ? f.dipendentiIds.filter(d => d !== id)
        : [...f.dipendentiIds, id]
    }))
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isNew ? 'Nuova Attività' : 'Modifica Attività'}
        footer={
          <>
            {!isNew && (
              <button onClick={() => setShowConfirmDelete(true)} className="btn-danger mr-auto">
                Elimina
              </button>
            )}
            <button onClick={onClose} className="btn-secondary">Annulla</button>
            <button onClick={handleSave} className="btn-primary">
              {isNew ? 'Aggiungi' : 'Salva'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Nome */}
          <div>
            <label className="label">Nome attività</label>
            <input
              className="input"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Es. Getto fondazioni"
              autoFocus
            />
          </div>

          {/* Cantiere */}
          <div>
            <label className="label">Cantiere</label>
            <select
              className="input"
              value={form.cantiereId}
              onChange={e => setForm(f => ({ ...f, cantiereId: e.target.value, macrocategoriaId: '' }))}
            >
              <option value="">— Seleziona cantiere —</option>
              {cantierizzati.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data inizio</label>
              <input
                type="date"
                className="input"
                value={form.dataInizio}
                onChange={e => setForm(f => ({ ...f, dataInizio: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Data fine</label>
              <input
                type="date"
                className="input"
                value={form.dataFine}
                min={form.dataInizio}
                onChange={e => setForm(f => ({ ...f, dataFine: e.target.value }))}
              />
            </div>
          </div>

          {/* Macrocategoria */}
          {cantiere && (
            <div>
              <label className="label">Macrocategoria</label>
              <select
                className="input"
                value={form.macrocategoriaId}
                onChange={e => setForm(f => ({ ...f, macrocategoriaId: e.target.value }))}
              >
                <option value="">— Nessuna —</option>
                {cantiere.macrocategorie?.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>
          )}

          {/* Dipendenti */}
          <div>
            <label className="label">
              Risorse assegnate
              {cantiere?.risorsePermesse?.length > 0 && (
                <span className="text-xs text-gray-400 ml-1">(filtrate per cantiere)</span>
              )}
            </label>
            {state.dipendenti.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nessun dipendente disponibile</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {risorseDisponibili.map(d => {
                  const sel = form.dipendentiIds.includes(d.id)
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDipendente(d.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                        sel ? 'border-primary-400 bg-primary-50 text-primary-800' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ background: d.colore }}
                      />
                      <span className="truncate">{d.nome} {d.cognome}</span>
                      {sel && <span className="ml-auto text-primary-500">✓</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="label">Note</label>
            <textarea
              className="input"
              rows={2}
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Note opzionali..."
            />
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Elimina attività"
        message={`Sei sicuro di voler eliminare "${attivita?.nome}"?`}
        danger
      />
    </>
  )
}
