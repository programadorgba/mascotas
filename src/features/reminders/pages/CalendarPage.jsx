import { useState } from 'react'
import CalendarGrid from '../components/CalendarGrid.jsx'
import { useCalendarPets, useCalendarEvents } from '../hooks/useCalendar.js'
import { useAuth } from '../../../shared/context/AuthContext.jsx'

export default function CalendarPage() {
  const { user } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [refreshKey, setRefreshKey] = useState(0)

  const pets = useCalendarPets(user?.id)
  const petIds = pets.map(p => p.id)
  const events = useCalendarEvents(month, year, petIds, refreshKey)

  function handleMonthChange(newMonth, newYear) {
    setMonth(newMonth)
    setYear(newYear)
  }

  function handleRefresh() {
    setRefreshKey((value) => value + 1)
  }

  return (
    <CalendarGrid
      month={month}
      year={year}
      events={events}
      pets={pets}
      onMonthChange={handleMonthChange}
      onRefresh={handleRefresh}
    />
  )
}
