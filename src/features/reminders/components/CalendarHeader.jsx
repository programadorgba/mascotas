import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthYear } from '../utils/dateUtils.js'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function CalendarHeader({ month, year, onPrev, onNext }) {
  return (
    <div className="calendar-header">
      <button className="icon-button calendar-nav-btn" type="button" onClick={onPrev} aria-label="Mes anterior">
        <ChevronLeft size={18} />
      </button>
      <h2 className="calendar-title">{formatMonthYear(month, year)}</h2>
      <button className="icon-button calendar-nav-btn" type="button" onClick={onNext} aria-label="Mes siguiente">
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

export { WEEKDAYS }