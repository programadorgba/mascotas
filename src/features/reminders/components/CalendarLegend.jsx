import EventDot from './EventDot.jsx'
import { PASTEL_COLORS, getPastelColor } from '../../reminders/constants.js'


// ✅ FIX: fallback estable usando el id como semilla, no el índice
function getPetColor(pet) {
  if (pet.color) return pet.color
  const seed = pet.id ? pet.id.charCodeAt(0) : 0
  return getPastelColor(seed)
}

export default function CalendarLegend({ pets }) {
  if (!pets?.length) return null

  return (
    <div className="calendar-legend">
      {pets.map((pet) => (
        <span key={pet.id} className="legend-item">
          <EventDot color={getPetColor(pet)} size={12} />
          <span style={{ fontWeight: '700' }}>{pet.name}</span>
        </span>
      ))}
    </div>
  )
}