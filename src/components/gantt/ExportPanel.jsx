import { useState } from 'react'
import Modal from '../common/Modal'
import { useApp } from '../../context/AppContext'
import { exportGanttPDF, exportToPNG, generatePDFReport } from '../../utils/export'
import toast from 'react-hot-toast'

export default function ExportPanel({ isOpen, onClose, viewMode = 'cantiere', filterCantiere = 'all', filterDipendente = 'all' }) {
  const { state } = useApp()
  const [tipo, setTipo] = useState('gantt_pdf')
  const [reportTarget, setReportTarget] = useState('generale')
  const [cantiereId, setCantiereId] = useState('')
  const [dipendenteId, setDipendenteId] = useState('')
  const [loading, setLoading] = useState(false)

  const cantierizzati = state.cantieri.filter(c => c.stato === 'cantierizzato')

  const handleExport = async () => {
    setLoading(true)
    try {
      if (tipo === 'gantt_pdf') {
        await exportGanttPDF(state, { viewMode, filterCantiere, filterDipendente })
        toast.success('PDF Gantt generato')
      } else if (tipo === 'gantt_png') {
        await exportToPNG('gantt-printable', 'gantt.png')
        toast.success('PNG esportato')
      } else {
        const id = reportTarget === 'cantiere' ? cantiereId : reportTarget === 'dipendente' ? dipendenteId : null
        generatePDFReport(state, reportTarget, id)
        toast.success('Report generato')
      }
      onClose()
    } catch {
      toast.error("Errore durante l'esportazione")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Esporta"
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
              { value: 'gantt_pdf', label: '📅 Gantt PDF (grafico vettoriale)' },
              { value: 'gantt_png', label: '🖼️ Gantt PNG (screenshot)' },
              { value: 'report',    label: '📄 Report testuale' },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="tipo" value={opt.value} checked={tipo === opt.value} onChange={e => setTipo(e.target.value)} />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {tipo === 'gantt_pdf' && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 space-y-1">
            <div>Vista corrente: <strong>{viewMode === 'cantiere' ? 'Cantieri' : 'Risorse'}</strong></div>
            <div>Il PDF si adatta automaticamente al periodo delle attività.</div>
            <div>Multi-pagina automatico se necessario.</div>
          </div>
        )}

        {tipo === 'report' && (
          <>
            <div>
              <label className="label">Contenuto report</label>
              <div className="space-y-2">
                {[
                  { value: 'generale',   label: '📄 Tutti i cantieri' },
                  { value: 'cantiere',   label: '🏗️ Per cantiere' },
                  { value: 'dipendente', label: '👷 Per dipendente' },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="reportTarget" value={opt.value} checked={reportTarget === opt.value} onChange={e => setReportTarget(e.target.value)} />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {reportTarget === 'cantiere' && (
              <div>
                <label className="label">Seleziona cantiere</label>
                <select className="input" value={cantiereId} onChange={e => setCantiereId(e.target.value)}>
                  <option value="">— Seleziona —</option>
                  {cantierizzati.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            )}

            {reportTarget === 'dipendente' && (
              <div>
                <label className="label">Seleziona dipendente</label>
                <select className="input" value={dipendenteId} onChange={e => setDipendenteId(e.target.value)}>
                  <option value="">— Seleziona —</option>
                  {state.dipendenti.map(d => <option key={d.id} value={d.id}>{d.nome} {d.cognome}</option>)}
                </select>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
