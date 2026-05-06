import { useState, useRef, useCallback, useMemo, useLayoutEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { getDaysArray, GIORNI_SHORT, MESI_IT } from '../../utils/dateUtils'
import { attivitaHasConflict } from '../../utils/conflicts'
import { parseISO, differenceInDays, isWeekend } from 'date-fns'
import ActivityModal from '../gantt/ActivityModal'

const LANE_H = 30
const LANE_PAD = 8
const MIN_ROW_H = 40
const HEADER_H = 56
const LEFT_W = 220

const ZOOM_LEVELS = [6, 10, 16, 24, 36, 52]
const ZOOM_LABELS = ['Anno', 'Semestre', 'Trimestre', 'Bimestre', 'Mese', 'Dettaglio']
const DEFAULT_ZOOM = 3

const CANTIERE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
]

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

export default function VistaDipendenti() {
  const { state, dispatch, conflicts } = useApp()

  const [modal, setModal] = useState({ open: false, attivita: null, cantiereId: null, dataInizio: null, dataFine: null, dipendentiIds: null })
  const [filterCantiere, setFilterCantiere] = useState('all')
  const [filterDipendente, setFilterDipendente] = useState('all')
  const [zoomIdx, setZoomIdx] = useState(DEFAULT_ZOOM)

  const scrollRef = useRef(null)
  const dragStateRef = useRef(null)
  const rafRef = useRef(null)
  const drawStateRef = useRef(null)
  const [dragVisual, setDragVisual] = useState(null)
  const [drawVisual, setDrawVisual] = useState(null)

  const { settings, cantieri, attivita, dipendenti } = state
  const dayWidth = ZOOM_LEVELS[zoomIdx]
  const showDayNum  = dayWidth >= 14
  const showDayName = dayWidth >= 24

  const cantierizzati = useMemo(
    () => cantieri.filter(c => c.stato === 'cantierizzato'),
    [cantieri]
  )

  const days = useMemo(
    () => getDaysArray(settings.dataInizioGlobale, settings.dataFineGlobale),
    [settings.dataInizioGlobale, settings.dataFineGlobale]
  )

  const cantiereColorMap = useMemo(() => {
    const map = {}
    cantierizzati.forEach((c, i) => { map[c.id] = CANTIERE_COLORS[i % CANTIERE_COLORS.length] })
    return map
  }, [cantierizzati])

  const rowData = useMemo(() => {
    const filtered = filterDipendente === 'all' ? dipendenti : dipendenti.filter(d => d.id === filterDipendente)
    return filtered.map(dip => {
      let atts = attivita.filter(a => a.dipendentiIds.includes(dip.id))
      if (filterCantiere !== 'all') atts = atts.filter(a => a.cantiereId === filterCantiere)
      const { assignments, laneCount } = computeLanes(atts)
      const height = laneCount > 0 ? laneCount * LANE_H + LANE_PAD : MIN_ROW_H
      return { dip, atts, assignments, laneCount, height }
    })
  }, [dipendenti, attivita, filterDipendente, filterCantiere])

  const months = useMemo(() => {
    const result = []
    let cur = null
    days.forEach((d, i) => {
      const m = d.getMonth(), y = d.getFullYear()
      if (!cur || cur.month !== m || cur.year !== y) { cur = { month: m, year: y, start: i, count: 1 }; result.push(cur) }
      else cur.count++
    })
    return result
  }, [days])

  const dayIndex = useCallback((dateStr) => {
    if (!dateStr || !settings.dataInizioGlobale) return -1
    try { return differenceInDays(parseISO(dateStr), parseISO(settings.dataInizioGlobale)) }
    catch { return -1 }
  }, [settings.dataInizioGlobale])

  const indexToDate = useCallback((idx) => {
    if (!settings.dataInizioGlobale) return ''
    try {
      const d = new Date(parseISO(settings.dataInizioGlobale))
      d.setDate(d.getDate() + idx)
      return d.toISOString().split('T')[0]
    } catch { return '' }
  }, [settings.dataInizioGlobale])

  const xToCol = useCallback((x) =>
    Math.max(0, Math.min(days.length - 1, Math.floor(x / dayWidth)))
  , [days.length, dayWidth])

  const todayIdx = dayIndex(new Date().toISOString().split('T')[0])

  const scrollToToday = useCallback(() => {
    if (scrollRef.current && todayIdx >= 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayIdx * dayWidth - dayWidth * 3)
    }
  }, [todayIdx, dayWidth])

  useLayoutEffect(() => { scrollToToday() }, [scrollToToday])

  // ── Drag (move) ──────────────────────────────────────────────────────────────
  const handleActivityMouseDown = useCallback((e, att) => {
    if (e.button !== 0) return
    e.stopPropagation(); e.preventDefault()
    const startX = e.clientX
    const origStart = dayIndex(att.dataInizio)
    const origEnd   = dayIndex(att.dataFine)
    const duration  = origEnd - origStart

    const onMove = (me) => {
      const dx = Math.round((me.clientX - startX) / dayWidth)
      const s = Math.max(0, Math.min(days.length - 1 - duration, origStart + dx))
      dragStateRef.current = { id: att.id, startIdx: s, endIdx: s + duration }
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          setDragVisual(dragStateRef.current ? { ...dragStateRef.current } : null)
          rafRef.current = null
        })
      }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      const ds = dragStateRef.current
      dragStateRef.current = null; setDragVisual(null)
      if (ds && ds.startIdx !== origStart) {
        dispatch({ type: 'UPDATE_ATTIVITA', payload: { id: att.id, data: { dataInizio: indexToDate(ds.startIdx), dataFine: indexToDate(ds.endIdx) } } })
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [dayIndex, days.length, dayWidth, indexToDate, dispatch])

  // ── Resize ───────────────────────────────────────────────────────────────────
  const handleResizeMouseDown = useCallback((e, att) => {
    e.stopPropagation(); e.preventDefault()
    const startX   = e.clientX
    const origEnd   = dayIndex(att.dataFine)
    const origStart = dayIndex(att.dataInizio)

    const onMove = (me) => {
      const dx = Math.round((me.clientX - startX) / dayWidth)
      const en = Math.max(origStart, Math.min(days.length - 1, origEnd + dx))
      dragStateRef.current = { id: att.id, startIdx: origStart, endIdx: en, resize: true }
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          setDragVisual(dragStateRef.current ? { ...dragStateRef.current } : null)
          rafRef.current = null
        })
      }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      const ds = dragStateRef.current
      dragStateRef.current = null; setDragVisual(null)
      if (ds && ds.endIdx !== origEnd) {
        dispatch({ type: 'UPDATE_ATTIVITA', payload: { id: att.id, data: { dataFine: indexToDate(ds.endIdx) } } })
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [dayIndex, days.length, dayWidth, indexToDate, dispatch])

  // ── Draw new activity ────────────────────────────────────────────────────────
  const handleRowMouseDown = useCallback((e, dipId) => {
    if (e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const col = xToCol(e.clientX - rect.left)
    drawStateRef.current = { rowKey: dipId, startIdx: col, endIdx: col }
    setDrawVisual({ rowKey: dipId, startIdx: col, endIdx: col })

    const onMove = (me) => {
      const col2 = xToCol(me.clientX - rect.left)
      drawStateRef.current = { rowKey: dipId, startIdx: col, endIdx: col2 }
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          setDrawVisual(drawStateRef.current ? { ...drawStateRef.current } : null)
          rafRef.current = null
        })
      }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      const ds = drawStateRef.current
      drawStateRef.current = null; setDrawVisual(null)
      if (ds) {
        const s  = Math.min(ds.startIdx, ds.endIdx)
        const en = Math.max(ds.startIdx, ds.endIdx)
        setModal({ open: true, attivita: null, cantiereId: null, dataInizio: indexToDate(s), dataFine: indexToDate(en), dipendentiIds: [dipId] })
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [xToCol, indexToDate])

  // ── Background grid ──────────────────────────────────────────────────────────
  const renderBgGrid = (height) => (
    <>
      <div className="absolute inset-0 flex pointer-events-none">
        {days.map((d, i) => (
          <div key={i} className={`border-r shrink-0 h-full ${i === todayIdx ? 'bg-primary-50' : isWeekend(d) ? 'bg-gray-50/60' : ''}`} style={{ width: dayWidth }} />
        ))}
      </div>
      {todayIdx >= 0 && todayIdx < days.length && (
        <div className="absolute top-0 bottom-0 w-px bg-primary-400 z-10 pointer-events-none" style={{ left: todayIdx * dayWidth + dayWidth / 2 }} />
      )}
    </>
  )

  // ── Activity bars ────────────────────────────────────────────────────────────
  const renderActivityBars = (atts, assignments) =>
    atts.map(att => {
      const isDragging = dragVisual?.id === att.id
      const startIdx = isDragging ? dragVisual.startIdx : dayIndex(att.dataInizio)
      const endIdx   = isDragging ? dragVisual.endIdx   : dayIndex(att.dataFine)
      if (startIdx < 0 || endIdx < 0) return null
      const w = (endIdx - startIdx + 1) * dayWidth - 4
      if (w <= 0) return null
      const lane = assignments[att.id] ?? 0
      const top  = LANE_PAD / 2 + lane * LANE_H
      const hasConflict = attivitaHasConflict(att.id, conflicts)
      const color = cantiereColorMap[att.cantiereId] ?? '#6366f1'
      const cantiereName = cantieri.find(c => c.id === att.cantiereId)?.nome ?? ''
      return (
        <div
          key={att.id}
          title={`${att.nome}\n${cantiereName}\n${att.dataInizio} → ${att.dataFine}`}
          className={`absolute rounded select-none group flex items-center px-1.5 text-white text-xs font-medium shadow-sm cursor-move ${isDragging ? 'opacity-75 shadow-lg z-30' : 'z-10 hover:z-20 hover:shadow-md'}`}
          style={{
            left: startIdx * dayWidth + 2, top, width: w, height: LANE_H - 4,
            background: hasConflict
              ? `repeating-linear-gradient(45deg,${color},${color} 4px,#ef4444 4px,#ef4444 8px)`
              : color,
          }}
          onMouseDown={e => handleActivityMouseDown(e, att)}
          onClick={e => { e.stopPropagation(); setModal({ open: true, attivita: att, cantiereId: att.cantiereId, dataInizio: null, dataFine: null, dipendentiIds: null }) }}
        >
          <span className="truncate flex-1">{att.nome}</span>
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/20 rounded-r"
            onMouseDown={e => handleResizeMouseDown(e, att)}
          />
        </div>
      )
    })

  const totalGridWidth = days.length * dayWidth

  if (dipendenti.length === 0) {
    return (
      <div className="p-8">
        <div className="flex flex-col items-center justify-center h-80 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
          <span className="text-5xl mb-3">👷</span>
          <p className="text-lg font-medium">Nessun dipendente</p>
          <p className="text-sm mt-1">Aggiungi dipendenti dal pannello Admin per vederli qui</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-200 flex-wrap shrink-0">
        <h1 className="text-base font-semibold text-gray-800 mr-2">Vista Dipendenti</h1>

        <select className="input-sm" value={filterCantiere} onChange={e => setFilterCantiere(e.target.value)}>
          <option value="all">Tutti i cantieri</option>
          {cantierizzati.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select className="input-sm" value={filterDipendente} onChange={e => setFilterDipendente(e.target.value)}>
          <option value="all">Tutti i dipendenti</option>
          {dipendenti.map(d => <option key={d.id} value={d.id}>{d.nome} {d.cognome}</option>)}
        </select>

        {/* Zoom */}
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-1 py-0.5 shrink-0">
          <button onClick={() => setZoomIdx(i => Math.max(i - 1, 0))} disabled={zoomIdx === 0}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:bg-gray-100 disabled:opacity-30 text-sm font-bold">−</button>
          <span className="text-xs text-gray-500 w-16 text-center select-none">{ZOOM_LABELS[zoomIdx]}</span>
          <button onClick={() => setZoomIdx(i => Math.min(i + 1, ZOOM_LEVELS.length - 1))} disabled={zoomIdx === ZOOM_LEVELS.length - 1}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:bg-gray-100 disabled:opacity-30 text-sm font-bold">+</button>
        </div>

        <button onClick={scrollToToday} className="btn-secondary btn-sm">⊙ Oggi</button>

        <button
          onClick={() => setModal({ open: true, attivita: null, cantiereId: null, dataInizio: null, dataFine: null, dipendentiIds: null })}
          className="btn-primary btn-sm ml-auto"
        >
          + Attività
        </button>
      </div>

      {/* Conflict banner */}
      {Object.keys(conflicts).length > 0 && (
        <div className="mx-5 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700 shrink-0">
          <span>⚠</span>
          <span><strong>{Object.keys(conflicts).length}</strong> conflitti di risorse — barre con pattern rosso</span>
        </div>
      )}

      {/* Grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto mx-5 my-3 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div style={{ width: LEFT_W + totalGridWidth, minWidth: '100%' }}>

          {/* Header */}
          <div className="sticky top-0 z-30 flex bg-white border-b border-gray-200">
            <div className="sticky left-0 z-40 bg-gray-50 border-r border-gray-200 flex items-end px-3 pb-1 text-xs text-gray-400 font-medium shrink-0" style={{ width: LEFT_W, height: HEADER_H }}>
              Dipendente
            </div>
            <div className="flex flex-col" style={{ width: totalGridWidth }}>
              {/* Months row */}
              <div className="flex" style={{ height: HEADER_H / 2 }}>
                {months.map((m, i) => (
                  <div key={i} className="border-r border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 bg-gray-50 shrink-0" style={{ width: m.count * dayWidth }}>
                    {MESI_IT[m.month]} {m.year}
                  </div>
                ))}
              </div>
              {/* Days row */}
              <div className="flex" style={{ height: HEADER_H / 2 }}>
                {days.map((d, i) => {
                  const isWE = isWeekend(d)
                  const isToday = i === todayIdx
                  return (
                    <div key={i} className={`flex flex-col items-center justify-center border-r text-center shrink-0 overflow-hidden ${isToday ? 'bg-primary-100 text-primary-700 font-bold' : isWE ? 'bg-gray-50 text-gray-300' : 'text-gray-500'}`} style={{ width: dayWidth }}>
                      {showDayName && <span className="text-[9px] leading-none">{GIORNI_SHORT[d.getDay()]}</span>}
                      {showDayNum  && <span className="text-[10px] font-medium">{d.getDate()}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Rows — one per dipendente */}
          {rowData.map(({ dip, atts, assignments, height }) => {
            const libero = atts.length === 0
            return (
              <div key={dip.id} className="flex border-b border-gray-100" style={{ height }}>
                {/* Left label */}
                <div
                  className="sticky left-0 z-20 border-r border-gray-100 flex items-center gap-2 px-3 shrink-0"
                  style={{ width: LEFT_W, height, background: libero ? '#f9fafb' : '#f0fdf4' }}
                >
                  <span className="w-3 h-3 rounded-full shrink-0 border-2 border-white shadow-sm" style={{ background: dip.colore }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-gray-800 truncate">{dip.nome} {dip.cognome}</div>
                    {libero
                      ? <span className="text-[10px] text-emerald-600 font-medium">Disponibile</span>
                      : <span className="text-[10px] text-gray-400">{atts.length} attività</span>
                    }
                  </div>
                </div>

                {/* Activity area */}
                <div
                  className="relative cursor-crosshair"
                  style={{ width: totalGridWidth, height }}
                  onMouseDown={e => handleRowMouseDown(e, dip.id)}
                >
                  {renderBgGrid(height)}
                  {libero && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: 'repeating-linear-gradient(90deg,transparent,transparent 6px,rgba(16,185,129,0.04) 6px,rgba(16,185,129,0.04) 7px)' }}
                    />
                  )}
                  {drawVisual?.rowKey === dip.id && (
                    <div className="absolute rounded bg-primary-300/60 border border-primary-400 pointer-events-none z-20" style={{
                      left: Math.min(drawVisual.startIdx, drawVisual.endIdx) * dayWidth + 2,
                      width: (Math.abs(drawVisual.endIdx - drawVisual.startIdx) + 1) * dayWidth - 4,
                      top: LANE_PAD / 2, height: LANE_H - 4,
                    }} />
                  )}
                  {renderActivityBars(atts, assignments)}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="sticky bottom-0 border-t border-gray-100 px-5 py-2 flex items-center gap-6 flex-wrap bg-gray-50/95 backdrop-blur-sm text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />Disponibile
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-8 h-3 rounded bg-blue-400 inline-block" />Attività (colore = cantiere)
          </span>
          {cantierizzati.map((c, i) => (
            <span key={c.id} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: CANTIERE_COLORS[i % CANTIERE_COLORS.length] }} />
              {c.nome}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="w-px h-4 bg-primary-400 inline-block" />Oggi
          </span>
          <span className="ml-auto text-gray-400 hidden lg:block">
            Trascina per creare · Trascina barra per spostare · Bordo destro per ridimensionare
          </span>
        </div>
      </div>

      <ActivityModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, attivita: null, cantiereId: null, dataInizio: null, dataFine: null, dipendentiIds: null })}
        attivita={modal.attivita}
        cantiereId={modal.cantiereId}
        dataInizio={modal.dataInizio}
        dataFine={modal.dataFine}
        dipendentiIds={modal.dipendentiIds}
      />
    </div>
  )
}
