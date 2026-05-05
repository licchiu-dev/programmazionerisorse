import { useState, useEffect, useCallback } from 'react'
import { Toaster } from 'react-hot-toast'
import Sidebar from './Sidebar'
import { useApp } from '../../context/AppContext'
import toast from 'react-hot-toast'

export default function Layout({ children, currentPage, onNavigate }) {
  const { undo, redo, canUndo, canRedo } = useApp()

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) { undo(); toast('↩ Annullato', { icon: '↩', duration: 1500 }) }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        if (canRedo) { redo(); toast('↪ Ripristinato', { icon: '↪', duration: 1500 }) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [canUndo, canRedo, undo, redo])

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-5 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { if (canUndo) { undo(); toast('↩ Annullato', { icon: '↩', duration: 1500 }) } }}
              disabled={!canUndo}
              title="Annulla (Ctrl+Z)"
              className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={() => { if (canRedo) { redo(); toast('↪ Ripristinato', { icon: '↪', duration: 1500 }) } }}
              disabled={!canRedo}
              title="Ripristina (Ctrl+Y)"
              className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>
          <div className="text-xs text-gray-400">
            Programmazione Risorse Cantieri · v1.0
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'text-sm font-medium',
          duration: 3000,
          style: { background: '#1f2937', color: '#f9fafb', borderRadius: '10px' },
          success: { style: { background: '#065f46', color: '#ecfdf5' } },
          error: { style: { background: '#7f1d1d', color: '#fef2f2' } },
        }}
      />
    </div>
  )
}
