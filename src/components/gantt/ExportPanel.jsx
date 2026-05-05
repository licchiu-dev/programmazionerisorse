import { useState } from 'react'
import Modal from '../common/Modal'
import { useApp } from '../../context/AppContext'
import { exportToPDF, exportToPNG, generatePDFReport } from '../../utils/export'
import toast from 'react-hot-toast'

export default function ExportPanel({ isOpen, onClose }) {
  const { state } = useApp()
  const [tipo, setTipo] = useState('generale')
  const [formato, setFormato] = useState('pdf')
  const [cantiereId, setCantiereId] = useState('')
  const [dipendenteId, setDipendenteId] = useState('')
  const [loading, setLoading] = useState(false)

  const cantierizzati = state.cantieri.filter(c => c.stato === 'cantierizzato')

  const handleExport = async () => {
    setLoading(true)
    try {
      if (tipo === 'gantt_visuale') {
        if (formato === 'pdf') await exportToPDF('gantt-printable', 'gantt.pdf')
        else await exportToPNG('gantt-printable', 'gantt.png')
        toast.success('Gantt esportato')
      } else {
        const id = tipo === 'cantiere' ? cantiereId : tipo === 'dipendente' ? dipendenteId : null
        generatePDFReport(state, tipo === 'gantt_visuale' ? 'generale' : tipo, id)
        toast.success('Report generato')
      }
      onClose()
    } catch (e) {
      toast.error('Errore durante l\'esportazione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Esporta Gantt / Report"
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Annulla</button>
          <button onClick={handleExport} disabled={loading} className="btn-primary">
            {loading ? 'Esportando...' : '↓ Esporta'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Tipo di export</label>
          <div className="space-y-2">
            {[
              { value: 'gantt_visuale', label: '📅 Gantt visuale (screenshot)' },
              { value: 'generale', label: '📄 Report generale (tutti i cantieri)' },
              { value: 'cantiere', label: '🏗️ Per cantiere' },
              { value: 'dipendente', label: '👷 Per dipendente' },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="tipo" value={opt.value} checked={tipo === opt.value} onChange={e => setTipo(e.target.value)} />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {tipo === 'cantiere' && (
          <div>
            <label className="label">Seleziona cantiere</label>
            <select className="input" value={cantiereId} onChange={e => setCantiereId(e.target.value)}>
              <option value="">— Seleziona —</option>
              {cantierizzati.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        )}

        {tipo === 'dipendente' && (
          <div>
            <label className="label">Seleziona dipendente</label>
            <select className="input" value={dipendenteId} onChange={e => setDipendenteId(e.target.value)}>
              <option value="">— Seleziona —</option>
              {state.dipendenti.map(d => <option key={d.id} value={d.id}>{d.nome} {d.cognome}</option>)}
            </select>
          </div>
        )}

        {tipo === 'gantt_visuale' && (
          <div>
            <label className="label">Formato</label>
            <div className="flex gap-3">
              {['pdf', 'png'].map(f => (
                <label key={f} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="formato" value={f} checked={formato === f} onChange={e => setFormato(e.target.value)} />
                  <span className="text-sm uppercase font-medium">{f}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
