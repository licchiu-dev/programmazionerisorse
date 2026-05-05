import { parseISO, eachDayOfInterval, isWithinInterval } from 'date-fns'

/**
 * Restituisce una mappa: { "dipendenteId_YYYY-MM-DD": [attivitaId, ...] }
 * Se un giorno ha più di 1 attività per la stessa risorsa → conflitto
 */
export function detectConflicts(attivita) {
  const map = {}

  for (const att of attivita) {
    if (!att.dataInizio || !att.dataFine || att.dipendentiIds.length === 0) continue
    try {
      const days = eachDayOfInterval({
        start: parseISO(att.dataInizio),
        end: parseISO(att.dataFine),
      })
      for (const day of days) {
        const dayStr = day.toISOString().split('T')[0]
        for (const dipId of att.dipendentiIds) {
          const key = `${dipId}_${dayStr}`
          if (!map[key]) map[key] = []
          map[key].push(att.id)
        }
      }
    } catch {
      // skip invalid dates
    }
  }

  // Filtra solo i conflitti veri (più di 1 attività)
  const conflicts = {}
  for (const [key, ids] of Object.entries(map)) {
    if (ids.length > 1) conflicts[key] = ids
  }
  return conflicts
}

/** Controlla se una specifica attività ha conflitti */
export function attivitaHasConflict(attivitaId, conflicts) {
  return Object.values(conflicts).some(ids => ids.includes(attivitaId))
}

/** Restituisce i conflitti di un dipendente come array di { data, attivitaIds } */
export function getConflictsForDipendente(dipId, conflicts) {
  const result = []
  for (const [key, ids] of Object.entries(conflicts)) {
    if (key.startsWith(`${dipId}_`)) {
      const data = key.replace(`${dipId}_`, '')
      result.push({ data, attivitaIds: ids })
    }
  }
  return result.sort((a, b) => a.data.localeCompare(b.data))
}

/** Ritorna tutti i dipendenti con almeno un conflitto */
export function getDipendentiConConflitti(dipendenti, conflicts) {
  const dipIds = new Set()
  for (const key of Object.keys(conflicts)) {
    const [dipId] = key.split('_')
    dipIds.add(dipId)
  }
  return dipendenti.filter(d => dipIds.has(d.id))
}

/** Controlla se un'attività è in conflitto in un dato giorno */
export function isDayConflict(dipId, dateStr, conflicts) {
  return !!conflicts[`${dipId}_${dateStr}`]
}
