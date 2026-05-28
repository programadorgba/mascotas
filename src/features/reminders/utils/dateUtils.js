// ✅ FIX: construir la fecha como string local en lugar de toISOString()
// toISOString() convierte a UTC — en UTC+2 la medianoche local es el día
// anterior en UTC, lo que desfasa todas las fechas y rompe isCurrentMonth
function toLocalDateStr(date) {
  const y  = date.getFullYear()
  const m  = String(date.getMonth() + 1).padStart(2, '0')
  const d  = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const todayStr = toLocalDateStr(new Date())

export function getMonthData(year, month) {
  const firstDay    = new Date(year, month - 1, 1)
  const lastDay     = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekday = (firstDay.getDay() + 6) % 7

  const days = []
  let day = 1 - startWeekday

  for (let i = 0; i < 42; i++) {
    const date = new Date(year, month - 1, day)
    const dateStr = toLocalDateStr(date)
    days.push({
      date:           dateStr,
      dayNum:         date.getDate(),
      isCurrentMonth: date.getMonth() === month - 1,
      isToday:        dateStr === todayStr,
    })
    day++
  }

  return { days, daysInMonth, startWeekday }
}

export function formatMonthYear(month, year) {
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}