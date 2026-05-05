import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { exportJSON, importJSON } from '../../utils/storage'
import { ConfirmModal } from '../common/Modal'
import { initialState } from '../../context/AppContext'
import toast from 'react-hot-toast'

export default function ImpostazioniGenerali() {
  const { state, dispatch } = useApp()
  const [confirmReset, setConfirmReset] = useState(false)
  const [form, setForm] = useState({
    nomeAzienda: state.settings.nomeAzienda,
    dataInizioGlobale: state.settings.dataInizioGlobale,
    dataFineGlobale: state.settings.dataFineGlobale,
  })

  const handleSave = () => {
    if (form.dataFineGlobale < form.dataInizioGlobale) {
      toast.error('La data fine deve essere dopo la data inizio')
      return
    }
    dispatch({ type: 'UPDATE_SETTINGS', payload: form })
    toast.success('Impostazioni salvate')
  }

  const handleExport = () => {
    exportJSON(state)
    toast.success('Backup esportato')
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await importJSON(file)
      dispatch({ type: 'IMPORT_DATA', payload: data })
      toast.success('Dati importati correttamente')
    } catch (err) {
      toast.error(`Errore import: ${err.message}`)
    }
    e.target.value = ''
  }

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-gray-800">Impostazioni Generali</h2>

      {/* Dati azienda */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Dati Azienda</h3>
        <div>
          <label className="label">Nome azienda</label>
          <input
            className="input"
            value={form.nomeAzienda}
            onChange={e => setForm(f => ({ ...f, nomeAzienda: e.target.value }))}
            placeholder="La mia Impresa"
          />
        </div>
        <button onClick={handleSave} className="btn-primary btn-sm">Salva</button>
      </div>

      {/* Range date Gantt */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Intervallo Gantt</h3>
        <p className="text-xs text-gray-500">Definisce il range di date visibili nel Gantt principale.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Data inizio</label>
            <input
              type="date"
              className="input"
              value={form.dataInizioGlobale}
              onChange={e => setForm(f => ({ ...f, dataInizioGlobale: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Data fine</label>
            <input
              type="date"
              className="input"
              value={form.dataFineGlobale}
              min={form.dataInizioGlobale}
              onChange={e => setForm(f => ({ ...f, dataFineGlobale: e.target.value }))}
            />
          </div>
        </div>
        <button onClick={handleSave} className="btn-primary btn-sm">Salva</button>
      </div>

      {/* Backup */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Backup & Ripristino</h3>
        <p className="text-xs text-gray-500">
          Esporta tutti i dati in un file JSON per backup o sincronizzazione tra computer.
          Per sincronizzare: esporta da un computer e importa sull'altro.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExport} className="btn-primary btn-sm">
            ↓ Esporta JSON
          </button>
          <label className="btn-secondary btn-sm cursor-pointer">
            ↑ Importa JSON
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </div>
        <div className="text-xs text-gray-400">
          <strong>Cantieri:</strong> {state.cantieri.length} ·
          <strong> Dipendenti:</strong> {state.dipendenti.length} ·
          <strong> Attività:</strong> {state.attivita.length}
        </div>
      </div>

      {/* Reset */}
      <div className="bg-red-50 rounded-xl border border-red-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-red-700">Zona Pericolosa</h3>
        <p className="text-xs text-red-600">Questa azione eliminerà tutti i dati. Non può essere annullata (a meno di avere un backup).</p>
        <button onClick={() => setConfirmReset(true)} className="btn-danger btn-sm">
          Reset completo dati
        </button>
      </div>

      <ConfirmModal
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          dispatch({ type: 'IMPORT_DATA', payload: initialState })
          toast.success('Dati resettati')
        }}
        title="Reset completo?"
        message="Tutti i cantieri, dipendenti e attività verranno eliminati. Questa operazione non può essere annullata."
        danger
      />
    </div>
  )
}
