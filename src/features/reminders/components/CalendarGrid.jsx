import { useState } from 'react'
import CalendarHeader, { WEEKDAYS } from './CalendarHeader.jsx'
import CalendarLegend from './CalendarLegend.jsx'
import EventModal from './EventModal.jsx'
import EventForm from './EventForm.jsx'
import EventDot from './EventDot.jsx'
import { getMonthData } from '../utils/dateUtils.js'
import { PASTEL_COLORS } from '../../reminders/constants.js'
import { supabase } from '../../../shared/lib/supabaseClient.js'

export default function CalendarGrid({ month, year, events, pets, onMonthChange, onRefresh }) {
  const [selectedDate, setSelectedDate] = useState(null)
  const [showForm, setShowForm]         = useState(false)

  const { days } = getMonthData(year, month)

  // ✅ FIX 1: fallback estable por id, no por índice del array
  const petColorMap = Object.fromEntries(
    (pets || []).map((p) => [p.id, p.color || PASTEL_COLORS[(p.id?.charCodeAt(0) ?? 0) % PASTEL_COLORS.length]])
  )

  const eventsByDate = events.reduce((acc, event) => {
    if (!acc[event.date]) acc[event.date] = []
    acc[event.date].push(event)
    return acc
  }, {})

  function handleDayClick(date) {
    const dayEvents = eventsByDate[date] || []
    setSelectedDate(date)
    if (dayEvents.length > 0) {
      setShowForm(false)
    } else {
      setShowForm(true)
    }
  }

  async function handleToggleComplete(event) {
    if (event.sourceTable === 'medications') {
      const { error } = await supabase
        .from('medications')
        .update({ active: !event.active })
        .eq('id', event.sourceId)

      if (error) { window.alert(error.message); return }
    }

    if (event.sourceTable === 'appointments') {
      const nextStatus = event.status === 'completada' ? 'pendiente' : 'completada'
      const { error } = await supabase
        .from('appointments')
        .update({ status: nextStatus })
        .eq('id', event.sourceId)

      if (error) { window.alert(error.message); return }
    }

    onRefresh?.()
  }

  function handleSave() {
    onRefresh?.()
    setShowForm(false)
    setSelectedDate(null)
  }

  return (
    <div className="calendar-section">
      <CalendarHeader
        month={month}
        year={year}
        onPrev={() => onMonthChange(month === 1 ? 12 : month - 1, month === 1 ? year - 1 : year)}
        onNext={() => onMonthChange(month === 12 ? 1 : month + 1, month === 12 ? year + 1 : year)}
      />

      <div className="calendar-grid">
        {WEEKDAYS.map(d => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
        {days.map(({ date, dayNum, isCurrentMonth, isToday }) => {
          const dayEvents = eventsByDate[date] || []
          return (
            <div
              key={date}
              className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
              onClick={() => handleDayClick(date)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && handleDayClick(date)}
            >
              <span className="day-number">{dayNum}</span>
              {dayEvents.length > 0 && (
                <div className="day-dots">
                  {[...new Map(dayEvents.map(e => [e.petId, e])).values()].map(event => (
                    <EventDot key={event.id} color={petColorMap[event.petId] || '#ccc'} size={20} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <CalendarLegend pets={pets} />

      {selectedDate && !showForm && (
        <EventModal
          date={selectedDate}
          events={events}
          pets={pets}
          onClose={() => setSelectedDate(null)}
          onToggleComplete={handleToggleComplete}
          onAddVisit={() => setShowForm(true)}
        />
      )}

      {selectedDate && showForm && (
        <EventForm
          date={selectedDate}
          pets={pets}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* ✅ FIX 2: no mostrar el botón si el formulario ya está abierto */}
      {selectedDate && !showForm && (
        <button
          className="primary-button"
          type="button"
          onClick={() => setShowForm(true)}
          style={{ marginTop: '12px' }}
        >
          + Añadir visita
        </button>
      )}
    </div>
  )
}
