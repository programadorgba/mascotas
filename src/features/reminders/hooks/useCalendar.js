
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

  const petIdsKey = petIds?.join(',') ?? ''

  useEffect(() => {
    if (!month || !year || !petIdsKey) {
      setEvents([])
      return
    }

    const petIdsArray = petIdsKey.split(',').filter(Boolean)

    async function load() {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay   = new Date(year, month, 0).getDate()
      const endDate   = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

      const [medsResult, remindersResult, visitsResult] = await Promise.all([
        supabase
          .from('visit_medications')
          .select('id, pet_id, name, start_date, end_date, active, frequency, dosage')
          .in('pet_id', petIdsArray)
          .eq('active', true),
        supabase
          .from('reminders')
          .select('id, pet_id, owner_id, type, title, notes, due_date, completed')
          .in('pet_id', petIdsArray),
        supabase
          .from('visits')
          .select('id, pet_id, visited_at, next_visit_date, reason, signed_by')
          .in('pet_id', petIdsArray)
          .not('next_visit_date', 'is', null),
      ])

      if (medsResult.error)      console.warn('[useCalendarEvents][visit_medications]', medsResult.error.message)
      if (remindersResult.error) console.warn('[useCalendarEvents][reminders]',      remindersResult.error.message)
      if (visitsResult.error)    console.warn('[useCalendarEvents][visits]',         visitsResult.error.message)

      const meds      = medsResult.data      || []
      const reminders  = remindersResult.data || []
      const visits     = visitsResult.data    || []

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
            sourceTable: 'visit_medications',
            petId:       m.pet_id,
            title:       m.name,
            date:        current,
            type:        'medicamento',
            frequency:   m.frequency,
            dosage:      m.dosage,
            active:      m.active,
            status:      'active',
          })
          current = addDays(current, 1)
        }
      })

      const reminderEvents = reminders
        .filter(r => r.due_date && r.due_date >= startDate && r.due_date <= endDate)
        .map(r => ({
          id:          r.id,
          sourceId:    r.id,
          sourceTable: 'reminders',
          petId:       r.pet_id,
          title:       r.title,
          date:        r.due_date,
          type:        r.type || 'recordatorio',
          notes:       r.notes,
          completed:   r.completed,
          status:      r.completed ? 'completed' : 'pending',
        }))

      const visitEvents = visits
        .filter(v => v.next_visit_date && v.next_visit_date >= startDate && v.next_visit_date <= endDate)
        .map(v => ({
          id:          v.id,
          sourceId:    v.id,
          sourceTable: 'visits',
          petId:       v.pet_id,
          title:       v.reason ? `Visita: ${v.reason}` : 'Próxima visita',
          date:        v.next_visit_date,
          type:        'visita',
          signed_by:   v.signed_by,
          status:      'scheduled',
        }))

      setEvents([...medEvents, ...reminderEvents, ...visitEvents])
    }

    load()
  }, [month, year, petIdsKey, refreshKey])

  return events
}