
import { useState, useEffect } from 'react'
import { supabase } from '../../../shared/lib/supabaseClient.js'

export function useCalendarPets(ownerId) {
  const [pets, setPets] = useState([])

  useEffect(() => {
    if (!ownerId) return

    async function load() {
      const { data, error } = await supabase
        .from('pets')
        .select('id, name, color')
        .eq('owner_id', ownerId)
        .order('created_at')

      if (error) {
        console.warn('[useCalendarPets]', error.message)
      }
      setPets(data || [])
    }

    load()
  }, [ownerId])

  return pets
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function useCalendarEvents(month, year, petIds, refreshKey = 0) {
  const [events, setEvents] = useState([])

  // ✅ FIX: serializar petIds a string para que React pueda compararlo entre renders
  // Un array nuevo en cada render (aunque tenga los mismos ids) disparaba el effect infinitamente
  const petIdsKey = petIds?.join(',') ?? ''

  useEffect(() => {
    if (!month || !year || !petIdsKey) {
      setEvents([])
      return
    }

    // Reconstruir el array desde el string estable
    const petIdsArray = petIdsKey.split(',').filter(Boolean)

    async function load() {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay   = new Date(year, month, 0).getDate()
      const endDate   = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

      const [medsResult, apptsResult] = await Promise.all([
        supabase
          .from('medications')
          .select('id, pet_id, name, start_date, end_date, active, frequency, dosage')
          .in('pet_id', petIdsArray),
        supabase
          .from('appointments')
          .select('id, pet_id, title, scheduled_at, status, appointment_type')
          .in('pet_id', petIdsArray),
      ])

      if (medsResult.error)  console.warn('[useCalendarEvents][medications]',  medsResult.error.message)
      if (apptsResult.error) console.warn('[useCalendarEvents][appointments]', apptsResult.error.message)

      const meds  = medsResult.data  || []
      const appts = apptsResult.data || []

      const medEvents = []
      meds.forEach(m => {
        if (!m.start_date) return
        const medStart = m.start_date
        const medEnd   = m.end_date || m.start_date

        if (medEnd < startDate || medStart > endDate) return

        const effectiveStart = medStart < startDate ? startDate : medStart
        const effectiveEnd   = medEnd   > endDate   ? endDate   : medEnd

        let current = effectiveStart
        while (current <= effectiveEnd) {
          medEvents.push({
            id:          `${m.id}-${current}`,
            sourceId:    m.id,
            sourceTable: 'medications',
            petId:       m.pet_id,
            title:       m.name,
            date:        current,
            type:        'medicamento',
            frequency:   m.frequency,
            dosage:      m.dosage,
            active:      m.active,
            status:      m.active ? 'active' : 'inactive',
          })
          current = addDays(current, 1)
        }
      })

      const apptEvents = appts
        .map(a => ({
          id:              a.id,
          sourceId:        a.id,
          sourceTable:     'appointments',
          petId:           a.pet_id,
          title:           a.title,
          date:            a.scheduled_at ? a.scheduled_at.split('T')[0] : null,
          type:            'visita',
          appointmentType: a.appointment_type,
          status:          a.status,
        }))
        .filter(e => e.date && e.date >= startDate && e.date <= endDate)

      setEvents([...medEvents, ...apptEvents])
    }

    load()
  }, [month, year, petIdsKey, refreshKey]) // ✅ petIdsKey string en lugar de petIds array

  return events
}