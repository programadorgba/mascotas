import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../../shared/lib/supabaseClient.js'
import { useAuth } from '../../../shared/context/AuthContext.jsx'

const TYPE_OPTIONS = [
  { value: 'vacuna',          label: 'Vacuna',          vetOnly: false },
  { value: 'desparasitacion', label: 'Desparasitación', vetOnly: false },
  { value: 'medicamento',     label: 'Medicamento',     vetOnly: true  }, // ✅ FIX 2: solo vets
  { value: 'visita',          label: 'Visita',          vetOnly: false },
  { value: 'otro',            label: 'Otro',            vetOnly: false },
]

export default function EventForm({ date, pets, onSave, onClose }) {
  const { user, profile } = useAuth()
  const isVet = profile?.role === 'vet'

  // ✅ FIX 2: filtrar tipos según rol
  const availableTypes = TYPE_OPTIONS.filter(o => !o.vetOnly || isVet)

  const [form, setForm] = useState({
    pet_id:    pets?.[0]?.id || '',
    title:     '',
    type:      'visita',
    time:      '10:00',          
    dosage:    '',
    frequency: '',
    end_date:  '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.pet_id || !form.title.trim()) {
      setError('Selecciona una mascota y escribe un título.')
      return
    }

    if (form.type === 'medicamento' && (!form.dosage.trim() || !form.frequency.trim())) {
      setError('Indica dosificacion y frecuencia para el medicamento.')
      return
    }

    setSaving(true)
    setError('')

    try {
      let insertError = null

      if (form.type === 'medicamento') {
        const payload = {
          pet_id:       form.pet_id,
          prescribed_by: user.id,
          name:         form.title.trim(),
          dosage:       form.dosage.trim(),
          frequency:    form.frequency.trim(),
          start_date:   date,
          end_date:     form.end_date || null,
          active:       true,
        }
        const response = await supabase.from('medications').insert(payload)
        insertError = response.error
      } else {
        const payload = {
          pet_id:           form.pet_id,
          title:            form.title.trim(),
          scheduled_at:     `${date}T${form.time}:00`, // ✅ FIX 1: hora del usuario
          appointment_type: form.type === 'visita' ? 'revision' : form.type,
          status:           'pendiente',
        }
        const response = await supabase.from('appointments').insert(payload)
        insertError = response.error
      }

      // ✅ FIX 3: solo cerrar si no hubo error
      if (insertError) throw insertError
      onSave()
      onClose()

    } catch (err) {
      setError(err.message || 'No se pudo crear el recordatorio.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nuevo recordatorio</h3>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-stack" style={{ marginTop: '16px' }}>

            <label>
              Mascota
              <select value={form.pet_id} onChange={e => setField('pet_id', e.target.value)} required>
                <option value="">Selecciona mascota</option>
                {pets?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>

            <label>
              Título
              <input
                value={form.title}
                onChange={e => setField('title', e.target.value)}
                placeholder="Nombre del recordatorio"
                required
              />
            </label>

            <label>
              Tipo
              <select value={form.type} onChange={e => setField('type', e.target.value)}>
                {availableTypes.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            {/* ✅ FIX 1: fecha y hora en la misma fila */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>
                Fecha
                <input type="date" value={date} readOnly />
              </label>
              <label>
                Hora
                <input
                  type="time"
                  value={form.time}
                  onChange={e => setField('time', e.target.value)}
                />
              </label>
            </div>

            {form.type === 'medicamento' && (
              <>
                <label>
                  Dosificacion
                  <input
                    value={form.dosage}
                    onChange={e => setField('dosage', e.target.value)}
                    placeholder="1 comprimido, 5 ml..."
                    required
                  />
                </label>
                <label>
                  Frecuencia
                  <input
                    value={form.frequency}
                    onChange={e => setField('frequency', e.target.value)}
                    placeholder="cada 24h, cada 8h..."
                    required
                  />
                </label>
                <label>
                  Fecha fin
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setField('end_date', e.target.value)}
                    min={date}
                  />
                </label>
              </>
            )}
          </div>

          {error && <p className="form-error" style={{ marginTop: '8px' }}>{error}</p>}

          <div className="form-actions" style={{ marginTop: '16px' }}>
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
