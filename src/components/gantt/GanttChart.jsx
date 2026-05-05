import { useState, useRef, useCallback, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { getDaysArray, dayWidth, GIORNI_SHORT, MESI_IT, formatDate } from '../../utils/dateUtils'
import { attivitaHasConflict } from '../../utils/conflicts'
import { parseISO, differenceInDays, format, isWeekend } from 'date-fns'
import ActivityModal from './ActivityModal'
import ExportPanel from './ExportPanel'
import toast from 'react-hot-toast'

const ROW_H = 52
const HEADER_H = 60
const LEFT_W = 220

export default function GanttChart() {
  const { state, dispatch, conflicts } = useApp()
  const ganttRef = useRef(null)
  const scrollRef = useRef(null)

  const [modal, setModal] = useState({ open: false, attivita: null, cantiereId: null, dataInizio: null, dataFine: null })
  const [showExport, setShowExport] = useState(false)
  const [filterCantiere, setFilterCantiere] = useState('all')
  const [filterDipendente, setFilterDipendente] = useState('all')
  const [dragState, setDragState] = useState(null)
  const [drawState, setDrawState] = useState(null) // for drawing new activities

  const { settings, cantieri, attivita, dipendenti } = state
  const cantierizzati = cantieri.filter(c => c.stato === 'cantierizzato')
  const days = useMemo(() => getDaysArray(settings.dataInizioGlobale, settings.dataFineGlobale), [settings.dataInizioGlobale, settings.dataFineGlobale])

  const filteredCantieri = filterCantiere === 'all' ? cantierizzati : cantierizzati.filter(c => c.id === filterCantiere)

  const getAttivitaForCantiere = (cantiereId) => {
    let atts = attivita.filter(a => a.cantiereId === cantiereId)
    if (filterDipendente !== 'all') {
      atts = atts.filter(a => a.dipendentiIds.includes(filterDipendente))
    }
    return atts
  }

  // Column index from date
  const dayIndex = useCallback((dateStr) => {
    if (!dateStr || !settings.dataInizioGlobale) return -1
    try {
      return differenceInDays(parseISO(dateStr), parseISO(settings.dataInizioGlobale))
    } catch { return -1 }
  }, [settings.dataInizioGlobale])

  // Date from column index
  const indexToDate = useCallback((idx) => {
    if (!settings.dataInizioGlobale) return ''
    try {
      const d = new Date(parseISO(settings.dataInizioGlobale))
      d.setDate(d.getDate() + idx)
      return d.toISOString().split('T')[0]
    } catch { return '' }
  }, [settings.dataInizioGlobale])

  // Get col index from mouse x in grid
  const xToColIndex = useCallback((x) => {
    return Math.max(0, Math.min(days.length - 1, Math.floor(x / dayWidth)))
  }, [days.length])

  // ── Header ────────────────────────────────────────────────────────────────

  const months = useMemo(() => {
    if (!days.length) return []
    const months = []
    let cur = null
    days.forEach((d, i) => {
      const m = d.getMonth()
      const y = d.getFullYear()
      if (!cur || cur.month !== m || cur.year !== y) {
        cur = { month: m, year: y, start: i, count: 1 }
        months.push(cur)
      } else {
        cur.count++
      }
    })
    return months
  }, [days])

  // ── Drag to move existing activity ────────────────────────────────────────

  const handleActivityMouseDown = useCallback((e, att) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const origStart = dayIndex(att.dataInizio)
    const origEnd = dayIndex(att.dataFine)
    const duration = origEnd - origStart

    const onMove = (me) => {
      const dx = Math.round((me.clientX - startX) / dayWidth)
      const newStart = Math.max(0, Math.min(days.length - 1 - duration, origStart + dx))
      const newEnd = newStart + duration
      setDragState({ id: att.id, startIdx: newStart, endIdx: newEnd })
    }

    const onUp = (me) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const dx = Math.round((me.clientX - startX) / dayWidth)
      const newStart = Math.max(0, Math.min(days.length - 1 - duration, origStart + dx))
      const newEnd = newStart + duration
      if (dx !== 0) {
        dispatch({
          type: 'UPDATE_ATTIVITA',
          payload: {
            id: att.id,
            data: { dataInizio: indexToDate(newStart), dataFine: indexToDate(newEnd) }
          }
        })
        toast.success('Attività spostata', { duration: 1500 })
      }
      setDragState(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [dayIndex, days.length, indexToDate, dispatch])

  // ── Drag to resize right edge ─────────────────────────────────────────────

  const handleResizeMouseDown = useCallback((e, att) => {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const origEnd = dayIndex(att.dataFine)
    const origStart = dayIndex(att.dataInizio)

    const onMove = (me) => {
      const dx = Math.round((me.clientX - startX) / dayWidth)
      const newEnd = Math.max(origStart, Math.min(days.length - 1, origEnd + dx))
      setDragState({ id: att.id, startIdx: origStart, endIdx: newEnd, resize: true })
    }

    const onUp = (me) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const dx = Math.round((me.clientX - startX) / dayWidth)
      const newEnd = Math.max(origStart, Math.min(days.length - 1, origEnd + dx))
      if (dx !== 0) {
        dispatch({
          type: 'UPDATE_ATTIVITA',
          payload: { id: att.id, data: { dataFine: indexToDate(newEnd) } }
        })
        toast.success('Attività ridimensionata', { duration: 1500 })
      }
      setDragState(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [dayIndex, days.length, indexToDate, dispatch])

  // ── Draw new activity on row ───────────────────────────────────────────────

  const handleRowMouseDown = useCallback((e, cantiereId) => {
    if (e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const col = xToColIndex(x)
    setDrawState({ cantiereId, startIdx: col, endIdx: col })

    const onMove = (me) => {
      const x2 = me.clientX - rect.left
      const col2 = xToColIndex(x2)
      setDrawState(ds => ds ? { ...ds, endIdx: col2 } : null)
    }

    const onUp = (me) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const x2 = me.clientX - rect.left
      const col2 = xToColIndex(x2)
      const s = Math.min(col, col2)
      const en = Math.max(col, col2)
      setDrawState(null)
      setModal({
        open: true,
        attivita: null,
        cantiereId,
        dataInizio: indexToDate(s),
        dataFine: indexToDate(en),
      })
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [xToColIndex, indexToDate])

  // ── Today indicator ────────────────────────────────────────────────────────
  const todayIdx = dayIndex(new Date().toISOString().split('T')[0])
  const showToday = todayIdx >= 0 && todayIdx < days.length

  if (cantierizzati.length === 0) {
    return (
      <div className="p-8">
        <div className="flex flex-col items-center justify-center h-80 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
          <span className="text-5xl mb-3">📅</span>
          <p className="text-lg font-medium">Nessun cantiere attivo</p>
          <p className="text-sm mt-1">Sposta un cantiere in stato "Cantierizzato" per vederlo nel Gantt</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-200 flex-wrap">
        <h1 className="text-base font-semibold text-gray-800 mr-2">Gantt Interattivo</h1>

        <select
          className="input-sm"
          value={filterCantiere}
          onChange={e => setFilterCantiere(e.target.value)}
        >
          <option value="all">Tutti i cantieri</option>
          {cantierizzati.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <select
          className="input-sm"
          value={filterDipendente}
          onChange={e => setFilterDipendente(e.target.value)}
        >
          <option value="all">Tutte le risorse</option>
          {dipendenti.map(d => <option key={d.id} value={d.id}>{d.nome} {d.cognome}</option>)}
        </select>

        <button
          onClick={() => setModal({ open: true, attivita: null, cantiereId: null, dataInizio: null, dataFine: null })}
          className="btn-primary btn-sm ml-auto"
        >
          + Attività
        </button>
        <button onClick={() => setShowExport(true)} className="btn-secondary btn-sm">
          ↓ Esporta
        </button>
      </div>

      {/* Conflicts banner */}
      {Object.keys(conflicts).length > 0 && (
        <div className="mx-5 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <span>⚠</span>
          <span className="font-medium">Conflitti rilevati:</span>
          <span>{Object.keys(conflicts).length} sovrapponizioo{Object.keys(conflicts).length > 1 ? 'ni' : 'ne'} di risorse — le attività coinvolte sono evidenziate in rosso</span>
        </div>
      )}

      {/* Gantt */}
      <div className="flex-1 overflow-hidden flex flex-col mx-5 my-3 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex overflow-hidden flex-1">
          {/* Fixed left panel */}
          <div className="shrink-0 border-r border-gray-200 bg-gray-50 z-10" style={{ width: LEFT_W }}>
            {/* Corner */}
            <div className="bg-gray-100 border-b border-gray-200 flex items-end px-3 pb-1 text-xs text-gray-400 font-medium" style={{ height: HEADER_H }}>
              Cantiere / Attività
            </div>
            {filteredCantieri.map((cantiere) => {
              const atts = getAttivitaForCantiere(cantiere.id)
              const totalRows = Math.max(1, atts.length)
              return (
                <div key={cantiere.id} className="border-b border-gray-100">
                  {/* Cantiere header row */}
                  <div
                    className="flex items-center gap-2 px-3 bg-primary-50 border-b border-primary-100"
                    style={{ height: ROW_H }}
                  >
                    <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-800 truncate">{cantiere.nome}</div>
                      <div className="text-xs text-gray-400 truncate">{cantiere.cliente}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Scrollable grid */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-auto">
            <div id="gantt-printable" ref={ganttRef} style={{ width: days.length * dayWidth, minWidth: '100%' }}>
              {/* Month header */}
              <div className="flex sticky top-0 z-20 bg-white border-b border-gray-200" style={{ height: HEADER_H / 2 }}>
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="border-r border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 bg-gray-50"
                    style={{ width: m.count * dayWidth, height: HEADER_H / 2, minWidth: m.count * dayWidth }}
                  >
                    {MESI_IT[m.month]} {m.year}
                  </div>
                ))}
              </div>

              {/* Day header */}
              <div className="flex sticky border-b border-gray-200 bg-white z-20" style={{ top: HEADER_H / 2, height: HEADER_H / 2 }}>
                {days.map((d, i) => {
                  const isWE = isWeekend(d)
                  const isToday = i === todayIdx
                  return (
                    <div
                      key={i}
                      className={`flex flex-col items-center justify-center border-r text-center shrink-0 ${
                        isToday ? 'bg-primary-100 text-primary-700 font-bold' :
                        isWE ? 'bg-gray-50 text-gray-300' : 'text-gray-500'
                      }`}
                      style={{ width: dayWidth, height: HEADER_H / 2 }}
                    >
                      <span className="text-[9px] leading-none">{GIORNI_SHORT[d.getDay()]}</span>
                      <span className="text-[10px] font-medium">{d.getDate()}</span>
                    </div>
                  )
                })}
              </div>

              {/* Rows */}
              {filteredCantieri.map((cantiere) => {
                const atts = getAttivitaForCantiere(cantiere.id)
                return (
                  <div key={cantiere.id} className="border-b border-gray-100">
                    {/* Single row per cantiere with all its activities as bars */}
                    <div
                      className="relative cursor-crosshair"
                      style={{ height: ROW_H }}
                      onMouseDown={e => handleRowMouseDown(e, cantiere.id)}
                    >
                      {/* Background grid */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {days.map((d, i) => (
                          <div
                            key={i}
                            className={`border-r shrink-0 ${
                              i === todayIdx ? 'bg-primary-50' :
                              isWeekend(d) ? 'bg-gray-50' : ''
                            }`}
                            style={{ width: dayWidth, height: '100%' }}
                          />
                        ))}
                      </div>

                      {/* Today line */}
                      {showToday && (
                        <div
                          className="absolute top-0 bottom-0 w-px bg-primary-400 z-10 pointer-events-none"
                          style={{ left: todayIdx * dayWidth + dayWidth / 2 }}
                        />
                      )}

                      {/* Draw preview */}
                      {drawState?.cantiereId === cantiere.id && (
                        <div
                          className="absolute top-3 h-7 rounded bg-primary-300/60 border border-primary-400 pointer-events-none z-20"
                          style={{
                            left: Math.min(drawState.startIdx, drawState.endIdx) * dayWidth + 2,
                            width: (Math.abs(drawState.endIdx - drawState.startIdx) + 1) * dayWidth - 4,
                          }}
                        />
                      )}

                      {/* Activity bars */}
                      {atts.map((att, rowOff) => {
                        const isDragging = dragState?.id === att.id
                        const startIdx = isDragging ? dragState.startIdx : dayIndex(att.dataInizio)
                        const endIdx = isDragging ? dragState.endIdx : dayIndex(att.dataFine)
                        if (startIdx < 0 || endIdx < 0) return null
                        const width = (endIdx - startIdx + 1) * dayWidth - 4
                        if (width <= 0) return null

                        const hasConflict = attivitaHasConflict(att.id, conflicts)
                        const dipColor = att.dipendentiIds.length > 0
                          ? dipendenti.find(d => d.id === att.dipendentiIds[0])?.colore
                          : '#6366f1'
                        const topOffset = 4 + rowOff * 16 // stack bars if multiple
                        const barHeight = Math.min(ROW_H - 8, 24)

                        return (
                          <div
                            key={att.id}
                            title={`${att.nome}\n${att.dataInizio} → ${att.dataFine}\n${att.dipendentiIds.map(id => { const d = dipendenti.find(x => x.id === id); return d ? `${d.nome} ${d.cognome}` : '' }).join(', ')}`}
                            className={`absolute rounded select-none group flex items-center px-1.5 text-white text-xs font-medium shadow-sm cursor-move ${
                              hasConflict ? 'ring-2 ring-red-500 ring-offset-0' : ''
                            } ${isDragging ? 'opacity-70 shadow-lg z-30' : 'z-10 hover:z-20'}`}
                            style={{
                              left: startIdx * dayWidth + 2,
                              width,
                              top: topOffset,
                              height: barHeight,
                              background: hasConflict
                                ? `repeating-linear-gradient(45deg, ${dipColor}, ${dipColor} 4px, #ef4444 4px, #ef4444 8px)`
                                : dipColor,
                            }}
                            onMouseDown={e => handleActivityMouseDown(e, att)}
                            onClick={e => { e.stopPropagation(); setModal({ open: true, attivita: att, cantiereId: att.cantiereId, dataInizio: null, dataFine: null }) }}
                          >
                            <span className="truncate">{att.nome}</span>
                            {att.dipendentiIds.length > 1 && (
                              <span className="ml-1 text-white/70">+{att.dipendentiIds.length - 1}</span>
                            )}
                            {/* Resize handle */}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/20 rounded-r"
                              onMouseDown={e => handleResizeMouseDown(e, att)}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="border-t border-gray-100 px-5 py-2 flex items-center gap-6 flex-wrap bg-gray-50">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-8 h-3 rounded bg-primary-400" />
            Attività
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-8 h-3 rounded"
              style={{ background: 'repeating-linear-gradient(45deg, #6366f1, #6366f1 4px, #ef4444 4px, #ef4444 8px)' }}
            />
            Conflitto
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-px h-4 bg-primary-400" />
            Oggi
          </div>
          <span className="text-xs text-gray-400 ml-auto">
            Trascina sulle celle per creare · Trascina la barra per spostare · Trascina il bordo destro per ridimensionare
          </span>
        </div>
      </div>

      <ActivityModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, attivita: null, cantiereId: null, dataInizio: null, dataFine: null })}
        attivita={modal.attivita}
        cantiereId={modal.cantiereId}
        dataInizio={modal.dataInizio}
        dataFine={modal.dataFine}
      />

      <ExportPanel isOpen={showExport} onClose={() => setShowExport(false)} />
    </div>
  )
}
