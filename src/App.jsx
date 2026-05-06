import { useState, useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Layout from './components/layout/Layout'
import GanttChart from './components/gantt/GanttChart'
import CantieriAccettati from './components/cantieri/CantieriAccettati'
import CantieriCantierizzati from './components/cantieri/CantieriCantierizzati'
import CantieriCompletati from './components/cantieri/CantieriCompletati'
import AdminPanel from './components/admin/AdminPanel'
import Login from './pages/Login'
import { supabase, isSupabaseConfigured } from './utils/supabase'
import { seedDemoData } from './utils/demoData'

function AppContent() {
  const [page, setPage] = useState('gantt')
  const { state, dispatch } = useApp()

  // Carica dati demo solo se DB è vuoto
  useEffect(() => {
    if (state.cantieri.length === 0 && state.dipendenti.length === 0) {
      const demo = seedDemoData()
      dispatch({ type: 'IMPORT_DATA', payload: { ...state, ...demo } })
    }
  }, [])

  const renderPage = () => {
    switch (page) {
      case 'gantt':          return <GanttChart />
      case 'accettati':      return <CantieriAccettati />
      case 'cantierizzati':  return <CantieriCantierizzati onNavigateGantt={() => setPage('gantt')} />
      case 'completati':     return <CantieriCompletati />
      case 'admin':          return <AdminPanel />
      default:               return <GanttChart />
    }
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  )
}

// Auth wrapper: mostra Login se Supabase è configurato e l'utente non è autenticato
function AuthGate({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    if (!isSupabaseConfigured()) { setSession(null); return }

    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  // Loading auth state
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Supabase configurato ma non autenticato → Login
  if (isSupabaseConfigured() && !session) return <Login />

  // Autenticato (o Supabase non configurato) → App
  return children
}

export default function App() {
  return (
    <AuthGate>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthGate>
  )
}
