import { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { useApp } from '../../context/AppContext'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'

export default function CantiereForm({ isOpen, onClose, cantiere, statoDefault = 'accettato' }) {
  const { state, dispatch } = useApp()
  const isNew = !cantiere?.id

  const defaultMacro = state.settings.macrocategorieDefault.map(n => ({ id: uuidv4(), nome: n, obbligatoria: true }))

  const [form, setForm] = useState({
    nome: '',
    cliente: '',
    dataAccettazione: new Date().toISOString().split('T')[0],
    importoStimato: '',
    stato: statoDefault,
    note: '',
    macrocategorie: defaultMacro,
    risorsePermesse: [],
  })
  const [tab, setTab] = useState('base')
  const [newMacro, setNewMacro] = useState('')

  useEffect(() => {
    if (cantiere) {
      setForm({
        nome: cantiere.nome || '',
        cliente: cantiere.cliente || '',
        dataAccettazione: cantiere.dataAccettazione || new Date().toISOString().split('T')[0],
        importoStimato: cantiere.importoStimato || '',
        stato: cantiere.stato || statoDefault,
        note: cantiere.note || '',
        macrocategorie: cantiere.macrocategorie || defaultMacro,
        risorsePermesse: cantiere.risorsePermesse || [],
      })
    } else {
      setForm({
        nome: '',
        cliente: '',
        dataAccettazione: new Date().toISOString().split('T')[0],
        importoStimato: '',
        stato: statoDefault,
        note: '',
        macrocategorie: defaultMacro,
        risorsePermesse: [],
      })
    }
    setTab('base')
  }, [cantiere, isOpen, statoDefault])

  const handleSave = () => {
    if (!form.nome.trim()) { toast.error('Inserisci il nome del cantiere'); return }
    if (isNew) {
      dispatch({ type: 'ADD_CANTIERE', payload: { ...form, importoStimato: parseFloat(form.importoStimato) || 0 } })
      toast.success('Cantiere aggiunto')
    } else {
      dispatch({ type: 'UPDATE_CANTIERE', payload: { id: cantiere.id, data: { ...form, importoStimato: parseFloat(form.importoStimato) || 0 } } })
      toast.success('Cantiere aggiornato')
    }
    onClose()
  }

  const addMacro = () => {
    if (!newMacro.trim()) return
    setForm(f => ({
      ...f,
      macrocategorie: [...f.macrocategorie, { id: uuidv4(), nome: newMacro.trim(), obbligatoria: true }]
    }))
    setNewMacro('')
  }

  const removeMacro = (id) => setForm(f => ({ ...f, macrocategorie: f.macrocategorie.filter(m => m.id !== id) }))
  const toggleMacroObbligatoria = (id) => setForm(f => ({
    ...f,
    macrocategorie: f.macrocategorie.map(m => m.id === id ? { ...m, obbligatoria: !m.obbligatoria } : m)
  }))

  const toggleRisorsa = (id) => setForm(f => ({
    ...f,
    risorsePermesse: f.risorsePermesse.includes(id)
      ? f.risorsePermesse.filter(r => r !== id)
      : [...f.risorsePermesse, id]
  }))

  const TABS = [
    { id: 'base', label: 'Dati Base' },
    { id: 'macro', label: `Lavorazioni (${form.macrocategorie.length})` },
    { id: 'risorse', label: `Risorse (${form.risorsePermesse.length || 'tutte'})` },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isNew ? 'Nuovo Cantiere' : `Modifica: ${cantiere?.nome}`}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Annulla</button>
          <button onClick={handleSave} className="btn-primary">
            {isNew ? 'Crea Cantiere' : 'Salva Modifiche'}
          </button>
        </>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 -mx-6 px-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Base */}
      {tab === 'base' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nome cantiere *</label>
              <input className="input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Es. Villa Rossi - Costruzione" autoFocus />
            </div>
            <div>
              <label className="label">Cliente</label>
              <input className="input" value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} placeholder="Cognome/Nome o azienda" />
            </div>
            <div>
              <label className="label">Data accettazione</label>
              <input type="date" className="input" value={form.dataAccettazione} onChange={e => setForm(f => ({ ...f, dataAccettazione: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Importo stimato (€)</label>
              <input type="number" className="input" value={form.importoStimato} onChange={e => setForm(f => ({ ...f, importoStimato: e.target.value }))} placeholder="0" min="0" />
            </div>
            <div className="col-span-2">
              <label className="label">Note</label>
              <textarea className="input" rows={3} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Descrizione, annotazioni..." />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Macrocategorie */}
      {tab === 'macro' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Le macrocategorie obbligatorie devono essere coperte da almeno un'attività per poter completare il cantiere.</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {form.macrocategorie.map(m => (
              <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 hover:bg-gray-50">
                <button
                  type="button"
                  onClick={() => toggleMacroObbligatoria(m.id)}
                  className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                    m.obbligatoria ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}
                  title={m.obbligatoria ? 'Obbligatoria (clicca per rendere facoltativa)' : 'Facoltativa (clicca per rendere obbligatoria)'}
                >
                  {m.obbligatoria ? '!' : '○'}
                </button>
                <span className="flex-1 text-sm">{m.nome}</span>
                <span className="text-xs text-gray-400">{m.obbligatoria ? 'obbligatoria' : 'facoltativa'}</span>
                <button onClick={() => removeMacro(m.id)} className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none">×</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              className="input flex-1"
              value={newMacro}
              onChange={e => setNewMacro(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMacro()}
              placeholder="Nuova lavorazione..."
            />
            <button onClick={addMacro} className="btn-primary">Aggiungi</button>
          </div>
        </div>
      )}

      {/* Tab: Risorse */}
      {tab === 'risorse' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Seleziona le risorse disponibili per questo cantiere. Se non ne selezioni nessuna, tutte le risorse saranno disponibili.
          </p>
          {state.dipendenti.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Nessun dipendente disponibile. Aggiungili dall'Admin Panel.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {state.dipendenti.map(d => {
                const sel = form.risorsePermesse.includes(d.id)
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleRisorsa(d.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      sel ? 'border-primary-400 bg-primary-50 text-primary-800' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.colore }} />
                    <span className="flex-1 text-left truncate">{d.nome} {d.cognome}</span>
                    {sel && <span className="text-primary-500">✓</span>}
                  </button>
                )
              })}
            </div>
          )}
          {form.risorsePermesse.length === 0 && state.dipendenti.length > 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              Nessuna risorsa selezionata → tutte le risorse saranno disponibili
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
