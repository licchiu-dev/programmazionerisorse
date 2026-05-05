import { useState, useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Layout from './components/layout/Layout'
import GanttChart from './components/gantt/GanttChart'
import CantieriAccettati from './components/cantieri/CantieriAccettati'
import CantieriCantierizzati from './components/cantieri/CantieriCantierizzati'
import CantieriCompletati from './components/cantieri/CantieriCompletati'
import AdminPanel from './components/admin/AdminPanel'
import { seedDemoData } from './utils/demoData'
import toast from 'react-hot-toast'

function AppContent() {
  const [page, setPage] = useState('gantt')
  const { state, dispatch } = useApp()

  // Carica dati demo se non ci sono dati
  useEffect(() => {
    if (state.cantieri.length === 0 && state.dipendenti.length === 0) {
      const demo = seedDemoData()
      dispatch({ type: 'IMPORT_DATA', payload: { ...state, ...demo } })
    }
  }, [])

  const renderPage = () => {
    switch (page) {
      case 'gantt':        return <GanttChart />
      case 'accettati':    return <CantieriAccettati />
      case 'cantierizzati': return <CantieriCantierizzati onNavigateGantt={() => setPage('gantt')} />
      case 'completati':   return <CantieriCompletati />
      case 'admin':        return <AdminPanel />
      default:             return <GanttChart />
    }
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
