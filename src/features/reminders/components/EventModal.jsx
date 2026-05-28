import { X } from 'lucide-react'
import EventDot from './EventDot.jsx'
import { PASTEL_COLORS } from '../constants.js'

const TYPE_LABELS = {
  medicamento: 'Medicamento',
  desparasitacion: 'Desparasitación',
  vacuna: 'Vacuna',
  cirugia: 'Cirugía',
  revision: 'Revisión',
  consulta: 'Consulta',
  otro: 'Otro',
  visita: 'Visita',
}

export default function EventModal({ date, events, pets, onClose, onToggleComplete, onAddVisit }) {
  const petColorMap = Object.fromEntries(
    // ✅ FIX: fallback estable por id, no por índice del array
    (pets || []).map((p) => [p.id, p.color || PASTEL_COLORS[(p.id?.charCodeAt(0) ?? 0) % PASTEL_COLORS.length]])
  )
  const petNameMap = Object.fromEntries((pets || []).map(p => [p.id, p.name]))

  const dayEvents = events.filter(e => e.date === date)

  function getTypeLabel(event) {
    if (event.type === 'medicamento') return 'Medicamento'
    return TYPE_LABELS[event.appointmentType] || 'Visita'
  }

  function getToggleLabel(event) {
    if (event.type === 'medicamento') {
      return event.active ? 'Marcar como inactivo' : 'Reactivar medicacion'
    }
    return event.status === 'completada' ? 'Marcar como pendiente' : 'Marcar como completada'
  }

  function getToggleSymbol(event) {
    if (event.type === 'medicamento') {
      // ✅ FIX: inactivo = terminado ✓ / activo = en curso ○
      return !event.active ? '✓' : '○'
    }
    return event.status === 'completada' ? '✓' : '○'
  }

  function isDone(event) {
    // ✅ FIX: activo = en curso (no done), inactivo = completado (done)
    if (event.type === 'medicamento') return !event.active
    return event.status === 'completada'
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {dayEvents.length > 0 && (
          <ul className="event-list">
            {dayEvents.map((event) => (
              <li key={`${event.type}-${event.id}`} className={`event-item ${event.status} ${event.type === 'medicamento' ? 'medication-event' : ''}`}>
                <EventDot color={petColorMap[event.petId] || '#ccc'} />
                <div className="event-info">
                  <strong>{event.title}</strong>
                  <span className="event-pet">{petNameMap[event.petId] || 'Mascota'}</span>
                  <span className={`event-type ${event.type === 'medicamento' ? 'med-type' : ''}`}>{getTypeLabel(event)}</span>
                  {event.dosage && <span className="event-dosage">{event.dosage} — {event.frequency}</span>}
                </div>
                <button
                  className={`complete-btn ${isDone(event) ? 'done' : ''}`}
                  type="button"
                  onClick={() => onToggleComplete(event)}
                  aria-label={getToggleLabel(event)}
                >
                  {getToggleSymbol(event)}
                </button>
              </li>
            ))}
          </ul>
        )}

        <button className="primary-button" type="button" onClick={onAddVisit} style={{ marginTop: '16px', width: '100%' }}>
          + Añadir visita
        </button>

        <button className="secondary-button" type="button" onClick={onClose} style={{ marginTop: '16px', width: '100%' }}>
          Cerrar
        </button>
      </div>
    </div>
  )
}