import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export async function exportToPDF(elementId, filename = 'gantt.pdf') {
  const el = document.getElementById(elementId)
  if (!el) return
  try {
    const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] })
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
    pdf.save(filename)
  } catch (e) {
    console.error('Errore export PDF:', e)
    throw e
  }
}

export async function exportToPNG(elementId, filename = 'gantt.png') {
  const el = document.getElementById(elementId)
  if (!el) return
  try {
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    const link = document.createElement('a')
    link.download = filename
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch (e) {
    console.error('Errore export PNG:', e)
    throw e
  }
}

export function generatePDFReport(state, tipo, id) {
  const doc = new jsPDF()
  const { cantieri, dipendenti, attivita, settings } = state
  const now = new Date().toLocaleDateString('it-IT')

  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  doc.text(settings.nomeAzienda || 'Programmazione Risorse', 20, 20)
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text(`Generato il: ${now}`, 20, 28)

  let yPos = 42
  const lineH = 7

  const addLine = (label, value = '', bold = false) => {
    if (yPos > 270) { doc.addPage(); yPos = 20 }
    if (bold) doc.setFont(undefined, 'bold')
    doc.text(label, 20, yPos)
    if (bold) doc.setFont(undefined, 'normal')
    if (value) doc.text(value, 90, yPos)
    yPos += lineH
  }

  if (tipo === 'dipendente') {
    const dip = dipendenti.find(d => d.id === id)
    if (!dip) return
    doc.setFontSize(14)
    addLine(`Attività di: ${dip.nome} ${dip.cognome}`, '', true)
    yPos += 4
    const mieAtt = attivita.filter(a => a.dipendentiIds.includes(id))
    for (const att of mieAtt) {
      const cant = cantieri.find(c => c.id === att.cantiereId)
      addLine(`• ${att.nome}`, `${att.dataInizio} → ${att.dataFine}`)
      addLine(`  Cantiere: ${cant?.nome || '—'}`, '')
    }
    if (mieAtt.length === 0) addLine('Nessuna attività assegnata')

  } else if (tipo === 'cantiere') {
    const cant = cantieri.find(c => c.id === id)
    if (!cant) return
    doc.setFontSize(14)
    addLine(`Cantiere: ${cant.nome}`, '', true)
    addLine('Cliente:', cant.cliente)
    addLine('Importo stimato:', `€ ${cant.importoStimato?.toLocaleString('it-IT') || 0}`)
    yPos += 4
    addLine('Attività:', '', true)
    const mieAtt = attivita.filter(a => a.cantiereId === id)
    for (const att of mieAtt) {
      const nomiDip = att.dipendentiIds.map(did => {
        const d = dipendenti.find(d => d.id === did)
        return d ? `${d.nome} ${d.cognome}` : '?'
      }).join(', ')
      addLine(`• ${att.nome}`, `${att.dataInizio} → ${att.dataFine}`)
      addLine(`  Risorse: ${nomiDip || 'nessuna'}`, '')
    }
    if (mieAtt.length === 0) addLine('Nessuna attività')

  } else {
    // Generale
    doc.setFontSize(14)
    addLine('Report Generale', '', true)
    yPos += 4
    const cantCantierizzati = cantieri.filter(c => c.stato === 'cantierizzato')
    for (const cant of cantCantierizzati) {
      addLine(`━ ${cant.nome}`, cant.cliente, true)
      const mieAtt = attivita.filter(a => a.cantiereId === cant.id)
      for (const att of mieAtt) {
        addLine(`  • ${att.nome}`, `${att.dataInizio} → ${att.dataFine}`)
      }
      yPos += 2
    }
  }

  doc.save(`report_${tipo}_${now.replace(/\//g, '-')}.pdf`)
}
