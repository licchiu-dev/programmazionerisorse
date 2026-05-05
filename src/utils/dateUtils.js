import { format, parseISO, eachDayOfInterval, addDays, differenceInDays, startOfWeek, getISOWeek, isWeekend } from 'date-fns'
import { it } from 'date-fns/locale'

export { format, parseISO, eachDayOfInterval, addDays, differenceInDays, startOfWeek, getISOWeek, isWeekend }

export const formatDate = (dateStr) => {
  try { return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: it }) }
  catch { return dateStr }
}

export const formatMonth = (dateStr) => {
  try { return format(parseISO(dateStr), 'MMMM yyyy', { locale: it }) }
  catch { return dateStr }
}

export const formatShortDate = (dateStr) => {
  try { return format(parseISO(dateStr), 'd MMM', { locale: it }) }
  catch { return dateStr }
}

export const getDaysArray = (startStr, endStr) => {
  try {
    return eachDayOfInterval({ start: parseISO(startStr), end: parseISO(endStr) })
  } catch {
    return []
  }
}

export const dayWidth = 36 // px per giorno nel Gantt

export const MESI_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
export const GIORNI_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
export const GIORNI_SHORT = ['D', 'L', 'M', 'M', 'G', 'V', 'S']
