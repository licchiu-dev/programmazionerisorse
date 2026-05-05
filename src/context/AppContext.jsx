import { createContext, useContext, useReducer, useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { saveToStorage, loadFromStorage } from '../utils/storage'
import { loadFromSupabase, saveToSupabase, isSupabaseConfigured } from '../utils/supabase'
import { detectConflicts } from '../utils/conflicts'

// ─── Initial State ────────────────────────────────────────────────────────────

const MACROCATEGORIE_DEFAULT = [
  'Fondazioni', 'Strutture', 'Muratura', 'Impianti Elettrici',
  'Impianti Idraulici', 'Finiture Interne', 'Finiture Esterne', 'Pavimentazioni',
  'Serramenti', 'Tetto/Copertura'
]

const COLORI_DIPENDENTI = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#a855f7', '#0ea5e9', '#22c55e'
]

const today = new Date()
const startGlobal = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
const endGlobal = new Date(today.getFullYear(), today.getMonth() + 6, 0).toISOString().split('T')[0]

export const initialState = {
  cantieri: [],
  dipendenti: [],
  attivita: [],
  settings: {
    dataInizioGlobale: startGlobal,
    dataFineGlobale: endGlobal,
    nomeAzienda: 'La mia Impresa',
    giorniLavorativi: [1, 2, 3, 4, 5],
    macrocategorieDefault: MACROCATEGORIE_DEFAULT,
    coloriDipendenti: COLORI_DIPENDENTI,
  },
  actionLog: [],
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state, action) {
  const now = new Date().toISOString()

  switch (action.type) {

    case 'ADD_CANTIERE': {
      const cantiere = {
        id: uuidv4(),
        nome: '',
        cliente: '',
        dataAccettazione: new Date().toISOString().split('T')[0],
        importoStimato: 0,
        stato: 'accettato',
        note: '',
        macrocategorie: MACROCATEGORIE_DEFAULT.map(n => ({ id: uuidv4(), nome: n, obbligatoria: true })),
        risorsePermesse: [],
        dataCreazione: now,
        ...action.payload,
      }
      return {
        ...state,
        cantieri: [...state.cantieri, cantiere],
        actionLog: [logEntry('ADD_CANTIERE', `Cantiere "${cantiere.nome || 'Nuovo'}" aggiunto`, action.payload), ...state.actionLog],
      }
    }

    case 'UPDATE_CANTIERE': {
      return {
        ...state,
        cantieri: state.cantieri.map(c => c.id === action.payload.id ? { ...c, ...action.payload.data } : c),
        actionLog: [logEntry('UPDATE_CANTIERE', `Cantiere aggiornato`, action.payload), ...state.actionLog],
      }
    }

    case 'DELETE_CANTIERE': {
      const cantiere = state.cantieri.find(c => c.id === action.payload)
      return {
        ...state,
        cantieri: state.cantieri.filter(c => c.id !== action.payload),
        attivita: state.attivita.filter(a => a.cantiereId !== action.payload),
        actionLog: [logEntry('DELETE_CANTIERE', `Cantiere "${cantiere?.nome}" eliminato`, action.payload), ...state.actionLog],
      }
    }

    case 'CHANGE_STATO_CANTIERE': {
      const cantiere = state.cantieri.find(c => c.id === action.payload.id)
      return {
        ...state,
        cantieri: state.cantieri.map(c => c.id === action.payload.id ? { ...c, stato: action.payload.nuovoStato } : c),
        actionLog: [logEntry('CHANGE_STATO', `Cantiere "${cantiere?.nome}" → ${action.payload.nuovoStato}`, action.payload), ...state.actionLog],
      }
    }

    case 'DUPLICATE_CANTIERE': {
      const orig = state.cantieri.find(c => c.id === action.payload)
      if (!orig) return state
      const copy = {
        ...orig,
        id: uuidv4(),
        nome: `${orig.nome} (copia)`,
        stato: 'accettato',
        dataCreazione: now,
        macrocategorie: orig.macrocategorie.map(m => ({ ...m, id: uuidv4() })),
        risorsePermesse: [...orig.risorsePermesse],
      }
      return {
        ...state,
        cantieri: [...state.cantieri, copy],
        actionLog: [logEntry('DUPLICATE_CANTIERE', `Cantiere "${orig.nome}" duplicato`, action.payload), ...state.actionLog],
      }
    }

    case 'ADD_MACROCATEGORIA': {
      const { cantiereId, nome } = action.payload
      return {
        ...state,
        cantieri: state.cantieri.map(c =>
          c.id === cantiereId ? { ...c, macrocategorie: [...c.macrocategorie, { id: uuidv4(), nome, obbligatoria: true }] } : c
        ),
      }
    }

    case 'UPDATE_MACROCATEGORIA': {
      const { cantiereId, macroId, data } = action.payload
      return {
        ...state,
        cantieri: state.cantieri.map(c =>
          c.id === cantiereId ? { ...c, macrocategorie: c.macrocategorie.map(m => m.id === macroId ? { ...m, ...data } : m) } : c
        ),
      }
    }

    case 'DELETE_MACROCATEGORIA': {
      const { cantiereId, macroId } = action.payload
      return {
        ...state,
        cantieri: state.cantieri.map(c =>
          c.id === cantiereId ? { ...c, macrocategorie: c.macrocategorie.filter(m => m.id !== macroId) } : c
        ),
      }
    }

    case 'ADD_DIPENDENTE': {
      const usedColors = state.dipendenti.map(d => d.colore)
      const availColor = COLORI_DIPENDENTI.find(c => !usedColors.includes(c)) || COLORI_DIPENDENTI[state.dipendenti.length % COLORI_DIPENDENTI.length]
      const dipendente = {
        id: uuidv4(),
        nome: '',
        cognome: '',
        specializzazioni: [],
        colore: availColor,
        dataAssunzione: new Date().toISOString().split('T')[0],
        ...action.payload,
      }
      return {
        ...state,
        dipendenti: [...state.dipendenti, dipendente],
        actionLog: [logEntry('ADD_DIPENDENTE', `Dipendente "${dipendente.nome} ${dipendente.cognome}" aggiunto`, action.payload), ...state.actionLog],
      }
    }

    case 'UPDATE_DIPENDENTE': {
      return {
        ...state,
        dipendenti: state.dipendenti.map(d => d.id === action.payload.id ? { ...d, ...action.payload.data } : d),
        actionLog: [logEntry('UPDATE_DIPENDENTE', `Dipendente aggiornato`, action.payload), ...state.actionLog],
      }
    }

    case 'DELETE_DIPENDENTE': {
      const dip = state.dipendenti.find(d => d.id === action.payload)
      return {
        ...state,
        dipendenti: state.dipendenti.filter(d => d.id !== action.payload),
        attivita: state.attivita.map(a => ({ ...a, dipendentiIds: a.dipendentiIds.filter(id => id !== action.payload) })),
        cantieri: state.cantieri.map(c => ({ ...c, risorsePermesse: c.risorsePermesse.filter(id => id !== action.payload) })),
        actionLog: [logEntry('DELETE_DIPENDENTE', `Dipendente "${dip?.nome} ${dip?.cognome}" eliminato`, action.payload), ...state.actionLog],
      }
    }

    case 'ADD_ATTIVITA': {
      const attivita = {
        id: uuidv4(),
        cantiereId: '',
        nome: 'Nuova attività',
        dipendentiIds: [],
        macrocategoriaId: null,
        dataInizio: new Date().toISOString().split('T')[0],
        dataFine: new Date().toISOString().split('T')[0],
        note: '',
        ...action.payload,
      }
      return {
        ...state,
        attivita: [...state.attivita, attivita],
        actionLog: [logEntry('ADD_ATTIVITA', `Attività "${attivita.nome}" aggiunta`, action.payload), ...state.actionLog],
      }
    }

    case 'UPDATE_ATTIVITA': {
      return {
        ...state,
        attivita: state.attivita.map(a => a.id === action.payload.id ? { ...a, ...action.payload.data } : a),
        actionLog: [logEntry('UPDATE_ATTIVITA', `Attività aggiornata`, action.payload), ...state.actionLog],
      }
    }

    case 'DELETE_ATTIVITA': {
      const att = state.attivita.find(a => a.id === action.payload)
      return {
        ...state,
        attivita: state.attivita.filter(a => a.id !== action.payload),
        actionLog: [logEntry('DELETE_ATTIVITA', `Attività "${att?.nome}" eliminata`, action.payload), ...state.actionLog],
      }
    }

    case 'UPDATE_SETTINGS': {
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        actionLog: [logEntry('UPDATE_SETTINGS', 'Impostazioni aggiornate', action.payload), ...state.actionLog],
      }
    }

    case 'IMPORT_DATA': {
      return { ...action.payload, actionLog: [logEntry('IMPORT', 'Dati importati', null), ...(action.payload.actionLog || [])] }
    }

    case 'CLEAR_LOG': {
      return { ...state, actionLog: [] }
    }

    default:
      return state
  }
}

function logEntry(tipo, descrizione, payload) {
  return { id: uuidv4(), timestamp: new Date().toISOString(), tipo, descrizione, payload }
}

// ─── Undo/Redo Wrapper ────────────────────────────────────────────────────────

function useUndoableReducer(reducer, initialState) {
  const historyRef = useRef({ past: [], present: initialState, future: [] })
  const [, forceUpdate] = useReducer(x => x + 1, 0)

  const state = historyRef.current.present

  const dispatch = useCallback((action) => {
    const { past, present } = historyRef.current
    const next = reducer(present, action)
    historyRef.current = { past: [...past.slice(-49), present], present: next, future: [] }
    forceUpdate()
    return next
  }, [])

  const undo = useCallback(() => {
    const { past, present, future } = historyRef.current
    if (past.length === 0) return null
    const previous = past[past.length - 1]
    historyRef.current = { past: past.slice(0, -1), present: previous, future: [present, ...future] }
    forceUpdate()
    return previous
  }, [])

  const redo = useCallback(() => {
    const { past, present, future } = historyRef.current
    if (future.length === 0) return null
    const next = future[0]
    historyRef.current = { past: [...past, present], present: next, future: future.slice(1) }
    forceUpdate()
    return next
  }, [])

  const canUndo = historyRef.current.past.length > 0
  const canRedo = historyRef.current.future.length > 0

  const loadState = useCallback((newState) => {
    historyRef.current = { past: [], present: newState, future: [] }
    forceUpdate()
  }, [])

  return { state, dispatch, undo, redo, canUndo, canRedo, loadState }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext(null)

// syncStatus: 'idle' | 'syncing' | 'saved' | 'offline' | 'error'

export function AppProvider({ children }) {
  const { state, dispatch: rawDispatch, undo: rawUndo, redo: rawRedo, canUndo, canRedo, loadState } =
    useUndoableReducer(reducer, initialState)

  const [isLoading, setIsLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured() ? 'idle' : 'offline')
  const syncTimerRef = useRef(null)

  // ── Debounced Supabase save ───────────────────────────────────────────────
  const scheduleSave = useCallback((nextState) => {
    saveToStorage(nextState) // localStorage immediately

    if (!isSupabaseConfigured()) return

    setSyncStatus('syncing')
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(async () => {
      const ok = await saveToSupabase(nextState)
      setSyncStatus(ok ? 'saved' : 'error')
      if (ok) {
        // Reset to idle after 2s
        setTimeout(() => setSyncStatus('idle'), 2000)
      }
    }, 800)
  }, [])

  // ── Dispatch wrapper ──────────────────────────────────────────────────────
  const dispatch = useCallback((action) => {
    const nextState = rawDispatch(action)
    scheduleSave(nextState)
  }, [rawDispatch, scheduleSave])

  const undo = useCallback(() => {
    const prev = rawUndo()
    if (prev) scheduleSave(prev)
  }, [rawUndo, scheduleSave])

  const redo = useCallback(() => {
    const next = rawRedo()
    if (next) scheduleSave(next)
  }, [rawRedo, scheduleSave])

  // ── Initial load: Supabase → localStorage → demo ──────────────────────────
  useEffect(() => {
    async function init() {
      if (isSupabaseConfigured()) {
        setSyncStatus('syncing')
        const cloud = await loadFromSupabase()
        if (cloud && (cloud.cantieri?.length > 0 || cloud.dipendenti?.length > 0)) {
          loadState(cloud)
          saveToStorage(cloud)
          setSyncStatus('saved')
          setTimeout(() => setSyncStatus('idle'), 2000)
          setIsLoading(false)
          return
        }
        setSyncStatus('idle')
      }

      // Fallback to localStorage
      const local = loadFromStorage()
      if (local) {
        loadState(local)
        setIsLoading(false)
        return
      }

      setIsLoading(false)
    }
    init()
  }, [])

  const conflicts = detectConflicts(state.attivita)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {isSupabaseConfigured() ? 'Connessione a Supabase…' : 'Caricamento…'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <AppContext.Provider value={{ state, dispatch, undo, redo, canUndo, canRedo, conflicts, syncStatus }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp deve essere usato dentro AppProvider')
  return ctx
}
