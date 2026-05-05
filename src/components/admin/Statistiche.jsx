import { useApp } from '../../context/AppContext'
import { StatCard } from '../common/Badge'
import { getDipendentiConConflitti } from '../../utils/conflicts'

export default function Statistiche() {
  const { state, conflicts } = useApp()
  const { cantieri, dipendenti, attivita } = state

  const accettati = cantieri.filter(c => c.stato === 'accettato').length
  const cantierizzati = cantieri.filter(c => c.stato === 'cantierizzato').length
  const completati = cantieri.filter(c => c.stato === 'completato').length
  const conflictCount = Object.keys(conflicts).length
  const dipConConflitti = getDipendentiConConflitti(dipendenti, conflicts)
  const totalRevenue = cantieri.filter(c => c.stato === 'completato').reduce((s, c) => s + (Number(c.importoStimato) || 0), 0)
  const revenueAttiva = cantieri.filter(c => c.stato === 'cantierizzato').reduce((s, c) => s + (Number(c.importoStimato) || 0), 0)

  // Carico per dipendente
  const caricoPerDip = dipendenti.map(d => ({
    ...d,
    attivita: attivita.filter(a => a.dipendentiIds.includes(d.id)).length,
  })).sort((a, b) => b.attivita - a.attivita)

  const maxCarico = Math.max(...caricoPerDip.map(d => d.attivita), 1)

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-gray-800">Statistiche</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Cantieri attivi" value={cantierizzati} color="blue" icon="🏗️" />
        <StatCard label="Non cantierizzati" value={accettati} color="amber" icon="📋" />
        <StatCard label="Completati" value={completati} color="green" icon="✅" />
        <StatCard label="Dipendenti" value={dipendenti.length} color="purple" icon="👷" />
        <StatCard label="Conflitti rilevati" value={conflictCount} color={conflictCount > 0 ? 'red' : 'gray'} icon="⚠" />
        <StatCard label="Attività totali" value={attivita.length} color="blue" icon="📌" />
      </div>

      {/* Revenue */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">Revenue cantieri completati</div>
          <div className="text-xl font-bold text-green-700">
            {totalRevenue > 0 ? `€ ${totalRevenue.toLocaleString('it-IT')}` : '—'}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">Revenue cantieri in corso</div>
          <div className="text-xl font-bold text-blue-700">
            {revenueAttiva > 0 ? `€ ${revenueAttiva.toLocaleString('it-IT')}` : '—'}
          </div>
        </div>
      </div>

      {/* Dipendenti con conflitti */}
      {dipConConflitti.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-700 mb-2">⚠ Dipendenti con conflitti</h3>
          <div className="space-y-1">
            {dipConConflitti.map(d => (
              <div key={d.id} className="flex items-center gap-2 text-sm text-red-700">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.colore }} />
                <span>{d.nome} {d.cognome}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Carico dipendenti */}
      {dipendenti.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Carico di lavoro per dipendente</h3>
          <div className="space-y-2">
            {caricoPerDip.map(d => (
              <div key={d.id} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-36 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.colore }} />
                  <span className="text-xs text-gray-700 truncate">{d.nome} {d.cognome}</span>
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${(d.attivita / maxCarico) * 100}%`, background: d.colore }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-12 text-right shrink-0">{d.attivita} att.</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
