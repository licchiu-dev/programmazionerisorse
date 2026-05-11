import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { getDaysArray, parseISO, isWeekend } from './dateUtils'
import { differenceInDays } from 'date-fns'

const MESI_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

const CANTIERE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
]

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function computeLanes(attivita) {
  if (!attivita.length) return { assignments: {}, laneCount: 0 }
  const sorted = [...attivita]
    .filter(a => a.dataInizio && a.dataFine)
    .sort((a, b) => a.dataInizio.localeCompare(b.dataInizio))
  const laneEnds = []
  const assignments = {}
  for (const att of sorted) {
    let placed = false
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] < att.dataInizio) {
        assignments[att.id] = i; laneEnds[i] = att.dataFine; placed = true; break
      }
    }
    if (!placed) { assignments[att.id] = laneEnds.length; laneEnds.push(att.dataFine) }
  }
  return { assignments, laneCount: laneEnds.length }
}

// ── Programmatic PDF Gantt ────────────────────────────────────────────────────

export async function exportGanttPDF(state, options = {}) {
  const {
    viewMode = 'cantiere',
    filterCantiere = 'all',
    filterDipendente = 'all',
  } = options
  const { cantieri, dipendenti, attivita, settings } = state

  const cantierizzati = cantieri.filter(c => c.stato === 'cantierizzato')
  const cantiereColorMap = {}
  cantierizzati.forEach((c, i) => { cantiereColorMap[c.id] = CANTIERE_COLORS[i % CANTIERE_COLORS.length] })

  // ── Build rows ───────────────────────────────────────────────────────────────
  let rows = []
  if (viewMode === 'cantiere') {
    const filtered = filterCantiere === 'all'
      ? cantierizzati
      : cantierizzati.filter(c => c.id === filterCantiere)
    rows = filtered.map(c => {
      let atts = attivita.filter(a => a.cantiereId === c.id)
      if (filterDipendente !== 'all') atts = atts.filter(a => a.dipendentiIds.includes(filterDipendente))
      return {
        label: c.nome,
        sublabel: c.cliente || '',
        atts,
        getColor: (att) => dipendenti.find(d => d.id === att.dipendentiIds?.[0])?.colore ?? '#6366f1',
      }
    })
  } else {
    const filtered = filterDipendente === 'all'
      ? dipendenti
      : dipendenti.filter(d => d.id === filterDipendente)
    rows = filtered.map(dip => {
      let atts = attivita.filter(a => a.dipendentiIds.includes(dip.id))
      if (filterCantiere !== 'all') atts = atts.filter(a => a.cantiereId === filterCantiere)
      return {
        label: `${dip.nome} ${dip.cognome}`,
        sublabel: '',
        atts,
        getColor: (att) => cantiereColorMap[att.cantiereId] ?? '#6366f1',
      }
    })
  }

  // ── Date range from actual activities ────────────────────────────────────────
  const allAtts = rows.flatMap(r => r.atts).filter(a => a.dataInizio && a.dataFine)
  let startStr, endStr
  if (allAtts.length > 0) {
    const minDate = allAtts.reduce((m, a) => a.dataInizio < m ? a.dataInizio : m, allAtts[0].dataInizio)
    const maxDate = allAtts.reduce((m, a) => a.dataFine   > m ? a.dataFine   : m, allAtts[0].dataFine)
    const s = new Date(parseISO(minDate)); s.setDate(s.getDate() - 3)
    const e = new Date(parseISO(maxDate)); e.setDate(e.getDate() + 3)
    startStr = s.toISOString().split('T')[0]
    endStr   = e.toISOString().split('T')[0]
  } else {
    startStr = settings.dataInizioGlobale
    endStr   = settings.dataFineGlobale
  }
  const days = getDaysArray(startStr, endStr)
  const N = days.length

  // ── Layout constants (mm, A4 landscape) ─────────────────────────────────────
  const PW = 297, PH = 210
  const ML = 8, MT = 10, MR = 5, MB = 10
  const LEFT_W    = 52
  const GRID_AVAIL_W = PW - ML - MR - LEFT_W   // 232 mm
  const CONTENT_H    = PH - MT - MB             // 190 mm
  const MONTH_H = 7, DAY_H = 6
  const HEADER_H = MONTH_H + DAY_H              // 13 mm
  const LANE_H   = 6
  const LANE_PAD = 2
  const MIN_ROW_H = 10

  // ── Day width (fit to page, min 2.5 mm/day) ──────────────────────────────────
  const DAY_W = Math.max(2.5, Math.min(16, GRID_AVAIL_W / N))
  const DAYS_PER_HPAGE = Math.floor(GRID_AVAIL_W / DAY_W)

  // ── Compute lanes for each row ───────────────────────────────────────────────
  rows = rows.map(row => {
    const { assignments, laneCount } = computeLanes(row.atts)
    const height = Math.max(MIN_ROW_H, laneCount * LANE_H + LANE_PAD * 2)
    return { ...row, assignments, laneCount, height }
  })

  // ── Vertical slices (rows that fit in one page height) ───────────────────────
  const vSlices = []
  let curH = HEADER_H + 1, sliceStart = 0
  for (let i = 0; i < rows.length; i++) {
    if (curH + rows[i].height > CONTENT_H && i > sliceStart) {
      vSlices.push({ start: sliceStart, end: i })
      sliceStart = i; curH = HEADER_H + 1
    }
    curH += rows[i].height
  }
  vSlices.push({ start: sliceStart, end: rows.length })

  // ── Horizontal slices (days that fit in one page width) ──────────────────────
  const hSlices = []
  for (let d = 0; d < N; d += DAYS_PER_HPAGE) {
    hSlices.push({ startDay: d, endDay: Math.min(d + DAYS_PER_HPAGE, N) })
  }

  const totalPages = vSlices.length * hSlices.length
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const todayStr = new Date().toISOString().split('T')[0]
  let pageNum = 0

  for (const vSlice of vSlices) {
    for (const hSlice of hSlices) {
      if (pageNum > 0) doc.addPage()
      pageNum++

      const pageDays = days.slice(hSlice.startDay, hSlice.endDay)
      const nDays = pageDays.length
      const gridW = nDays * DAY_W
      const gX = ML + LEFT_W   // x where grid starts
      const gY = MT             // y where content starts

      // ── Month header ─────────────────────────────────────────────────────────
      let mX = gX
      let curMonth = null
      const monthBlocks = []
      for (let i = 0; i < nDays; i++) {
        const d = pageDays[i]
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (!curMonth || curMonth.key !== key) {
          curMonth = { key, month: d.getMonth(), year: d.getFullYear(), startX: mX, count: 1 }
          monthBlocks.push(curMonth)
        } else {
          curMonth.count++
        }
        mX += DAY_W
      }

      for (const mb of monthBlocks) {
        const mW = mb.count * DAY_W
        doc.setFillColor(243, 244, 246)
        doc.rect(mb.startX, gY, mW, MONTH_H, 'F')
        doc.setDrawColor(209, 213, 219); doc.setLineWidth(0.2)
        doc.rect(mb.startX, gY, mW, MONTH_H)
        doc.setFontSize(7); doc.setFont(undefined, 'bold'); doc.setTextColor(55, 65, 81)
        const label = `${MESI_IT[mb.month]} ${mb.year}`
        doc.text(label, mb.startX + mW / 2, gY + MONTH_H - 1.8, { align: 'center' })
      }

      // ── Left header cell ─────────────────────────────────────────────────────
      doc.setFillColor(243, 244, 246)
      doc.rect(ML, gY, LEFT_W, HEADER_H, 'F')
      doc.setDrawColor(209, 213, 219); doc.setLineWidth(0.2)
      doc.rect(ML, gY, LEFT_W, HEADER_H)
      doc.setFontSize(6.5); doc.setFont(undefined, 'normal'); doc.setTextColor(107, 114, 128)
      doc.text(viewMode === 'cantiere' ? 'Cantiere' : 'Dipendente', ML + 3, gY + HEADER_H - 2)

      // ── Day header ───────────────────────────────────────────────────────────
      for (let i = 0; i < nDays; i++) {
        const d = pageDays[i]
        const dStr = d.toISOString().split('T')[0]
        const isWE = isWeekend(d)
        const isToday = dStr === todayStr
        const dX = gX + i * DAY_W
        const dY = gY + MONTH_H

        if (isToday)     doc.setFillColor(219, 234, 254)
        else if (isWE)   doc.setFillColor(249, 250, 251)
        else             doc.setFillColor(255, 255, 255)
        doc.rect(dX, dY, DAY_W, DAY_H, 'F')
        doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.1)
        doc.line(dX + DAY_W, dY, dX + DAY_W, dY + DAY_H)

        if (DAY_W >= 3.5) {
          doc.setFontSize(4.5); doc.setFont(undefined, 'normal')
          doc.setTextColor(isToday ? 29 : isWE ? 180 : 107, isToday ? 78 : isWE ? 180 : 114, isToday ? 216 : isWE ? 180 : 128)
          doc.text(String(d.getDate()), dX + DAY_W / 2, dY + DAY_H - 1.3, { align: 'center' })
        }
      }

      // ── Today vertical line ───────────────────────────────────────────────────
      const todayPageIdx = pageDays.findIndex(d => d.toISOString().split('T')[0] === todayStr)
      if (todayPageIdx >= 0) {
        const tx = gX + todayPageIdx * DAY_W + DAY_W / 2
        doc.setDrawColor(59, 130, 246); doc.setLineWidth(0.4)
        doc.line(tx, gY, tx, PH - MB)
      }

      // ── Rows ─────────────────────────────────────────────────────────────────
      let rowY = gY + HEADER_H
      const sliceRows = rows.slice(vSlice.start, vSlice.end)

      for (let ri = 0; ri < sliceRows.length; ri++) {
        const row = sliceRows[ri]

        // Left cell background
        doc.setFillColor(ri % 2 === 0 ? 255 : 250, ri % 2 === 0 ? 255 : 250, ri % 2 === 0 ? 255 : 250)
        doc.rect(ML, rowY, LEFT_W, row.height, 'F')
        doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.2)
        doc.rect(ML, rowY, LEFT_W, row.height)

        // Row label
        doc.setFontSize(7); doc.setFont(undefined, 'bold'); doc.setTextColor(31, 41, 55)
        const labelLines = doc.splitTextToSize(row.label, LEFT_W - 5)
        doc.text(labelLines[0], ML + 3, rowY + 5)
        if (row.sublabel) {
          doc.setFont(undefined, 'normal'); doc.setFontSize(5.5); doc.setTextColor(107, 114, 128)
          doc.text(doc.splitTextToSize(row.sublabel, LEFT_W - 5)[0], ML + 3, rowY + 9)
        }

        // Grid columns background (weekend + vertical lines)
        for (let i = 0; i < nDays; i++) {
          const d = pageDays[i]
          const dX = gX + i * DAY_W
          if (isWeekend(d)) {
            doc.setFillColor(249, 250, 251)
            doc.rect(dX, rowY, DAY_W, row.height, 'F')
          }
          doc.setDrawColor(239, 240, 241); doc.setLineWidth(0.1)
          doc.line(dX + DAY_W, rowY, dX + DAY_W, rowY + row.height)
        }
        // Row bottom border
        doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.2)
        doc.line(ML, rowY + row.height, ML + LEFT_W + gridW, rowY + row.height)

        // Activity bars
        for (const att of row.atts) {
          if (!att.dataInizio || !att.dataFine) continue
          const attS = differenceInDays(parseISO(att.dataInizio), parseISO(startStr))
          const attE = differenceInDays(parseISO(att.dataFine),   parseISO(startStr))
          const clipS = Math.max(attS, hSlice.startDay)
          const clipE = Math.min(attE, hSlice.endDay - 1)
          if (clipS > clipE) continue

          const barX = gX + (clipS - hSlice.startDay) * DAY_W + 0.5
          const barW = (clipE - clipS + 1) * DAY_W - 1
          const lane = row.assignments[att.id] ?? 0
          const barY = rowY + LANE_PAD + lane * LANE_H
          const barH = LANE_H - 1

          const color = row.getColor(att) || '#6366f1'
          const [r, g, b] = hexToRgb(color)
          doc.setFillColor(r, g, b)
          doc.roundedRect(barX, barY, barW, barH, 0.7, 0.7, 'F')

          if (barW > 5) {
            doc.setFontSize(4.5); doc.setFont(undefined, 'normal'); doc.setTextColor(255, 255, 255)
            const lines = doc.splitTextToSize(att.nome, barW - 2)
            doc.text(lines[0], barX + 1.2, barY + barH - 1.3)
          }
        }

        rowY += row.height
      }

      // ── Outer border ─────────────────────────────────────────────────────────
      doc.setDrawColor(209, 213, 219); doc.setLineWidth(0.3)
      doc.rect(ML, gY, LEFT_W + gridW, rowY - gY)

      // ── Footer ───────────────────────────────────────────────────────────────
      doc.setFontSize(6); doc.setFont(undefined, 'normal'); doc.setTextColor(156, 163, 175)
      const vLabel = viewMode === 'cantiere' ? 'Vista Cantieri' : 'Vista Dipendenti'
      doc.text(`${settings.nomeAzienda || 'Programmazione Risorse'} — ${vLabel} — pag. ${pageNum}/${totalPages}`, ML, PH - 3)
      doc.text(new Date().toLocaleDateString('it-IT'), PW - MR, PH - 3, { align: 'right' })
    }
  }

  const name = `gantt_${viewMode}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(name)
}

// ── Legacy screenshot export (PNG only) ──────────────────────────────────────

async function captureGanttCanvas(elementId, scale = 1.5) {
  const scrollEl = document.getElementById(elementId)
  if (!scrollEl) throw new Error('Elemento non trovato')
  const inner = scrollEl.firstElementChild
  if (!inner) throw new Error('Contenuto Gantt non trovato')
  const clone = inner.cloneNode(true)
  Object.assign(clone.style, {
    position: 'fixed', left: '-99999px', top: '0',
    width: inner.scrollWidth + 'px', height: inner.scrollHeight + 'px',
    overflow: 'visible', zIndex: '-1',
  })
  clone.querySelectorAll('[class*="sticky"]').forEach(el => {
    el.style.setProperty('position', 'static', 'important')
  })
  document.body.appendChild(clone)
  try {
    await new Promise(r => requestAnimationFrame(r))
    return await html2canvas(clone, {
      scale, useCORS: true, backgroundColor: '#ffffff',
      width: inner.scrollWidth, height: inner.scrollHeight,
    })
  } finally {
    document.body.removeChild(clone)
  }
}

export async function exportToPNG(elementId, filename = 'gantt.png') {
  try {
    const canvas = await captureGanttCanvas(elementId, 2)
    const link = document.createElement('a')
    link.download = filename
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch (e) {
    console.error('Errore export PNG:', e)
    throw e
  }
}

// ── Text report (invariato) ───────────────────────────────────────────────────

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
    addLine(`Attivita di: ${dip.nome} ${dip.cognome}`, '', true)
    yPos += 4
    const mieAtt = attivita.filter(a => a.dipendentiIds.includes(id))
    for (const att of mieAtt) {
      const cant = cantieri.find(c => c.id === att.cantiereId)
      addLine(`- ${att.nome}`, `${att.dataInizio} > ${att.dataFine}`)
      addLine(`  Cantiere: ${cant?.nome || '-'}`, '')
    }
    if (mieAtt.length === 0) addLine('Nessuna attivita assegnata')

  } else if (tipo === 'cantiere') {
    const cant = cantieri.find(c => c.id === id)
    if (!cant) return
    doc.setFontSize(14)
    addLine(`Cantiere: ${cant.nome}`, '', true)
    addLine('Cliente:', cant.cliente)
    addLine('Importo stimato:', `EUR ${cant.importoStimato?.toLocaleString('it-IT') || 0}`)
    yPos += 4
    addLine('Attivita:', '', true)
    const mieAtt = attivita.filter(a => a.cantiereId === id)
    for (const att of mieAtt) {
      const nomiDip = att.dipendentiIds.map(did => {
        const d = dipendenti.find(d => d.id === did)
        return d ? `${d.nome} ${d.cognome}` : '?'
      }).join(', ')
      addLine(`- ${att.nome}`, `${att.dataInizio} > ${att.dataFine}`)
      addLine(`  Risorse: ${nomiDip || 'nessuna'}`, '')
    }
    if (mieAtt.length === 0) addLine('Nessuna attivita')

  } else {
    doc.setFontSize(14)
    addLine('Report Generale', '', true)
    yPos += 4
    for (const cant of cantieri.filter(c => c.stato === 'cantierizzato')) {
      addLine(`- ${cant.nome}`, cant.cliente, true)
      for (const att of attivita.filter(a => a.cantiereId === cant.id)) {
        addLine(`  - ${att.nome}`, `${att.dataInizio} > ${att.dataFine}`)
      }
      yPos += 2
    }
  }

  doc.save(`report_${tipo}_${now.replace(/\//g, '-')}.pdf`)
}
