import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileText, Ruler, Save, Scale, Stethoscope } from 'lucide-react'
import { supabase } from '../../../shared/lib/supabaseClient.js'
import { useAuth } from '../../../shared/context/AuthContext.jsx'

const initialForm = {
  record_type: 'Consulta',
  weight_kg: '',
  height_cm: '',
  notes: '',
  document_url: '',
}

export default function VetPetRecord() {
  const { petId } = useParams()
  const { user } = useAuth()
  const [pet, setPet] = useState(null)
  const [records, setRecords] = useState([])
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadData() {
    const [{ data: petData }, { data: recordData }] = await Promise.all([
      supabase.from('pets').select('id, name, animal_type, breed, chip_number, photo_url').eq('id', petId).single(),
      supabase.from('medical_records').select('*').eq('pet_id', petId).order('recorded_at', { ascending: false }),
    ])

    setPet(petData)
    setRecords(recordData || [])
  }

  useEffect(() => {
    loadData()
  }, [petId])

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    const { error: insertError } = await supabase.from('medical_records').insert({
      pet_id: petId,
      vet_id: user.id,
      record_type: form.record_type,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      notes: form.notes.trim() || null,
      document_url: form.document_url.trim() || null,
    })

    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setForm(initialForm)
    loadData()
  }

  if (!pet) return <main className="page"><p>Cargando ficha veterinaria...</p></main>

  return (
    <main className="page">
      <header className="pet-profile">
        <div className="pet-photo large">
          {pet.photo_url ? <img src={pet.photo_url} alt={pet.name} /> : <Stethoscope size={44} />}
        </div>
        <div>
          <span className="eyebrow">Ficha clinica</span>
          <h1>{pet.name}</h1>
          <p>{pet.animal_type}{pet.breed ? ` · ${pet.breed}` : ''} · Chip {pet.chip_number}</p>
        </div>
      </header>

      <section className="split-layout">
        <form className="data-card form-grid" onSubmit={handleSubmit}>
          <h2 className="full-span">Nuevo registro medico</h2>
          <label>Tipo de registro
            <select value={form.record_type} onChange={(e) => setField('record_type', e.target.value)}>
              <option>Consulta</option>
              <option>Analisis clinico</option>
              <option>Desparasitacion</option>
              <option>Cirugia</option>
              <option>Radiografia</option>
              <option>Vacuna</option>
              <option>Otro</option>
            </select>
          </label>
          <label>Peso kg<input type="number" step="0.01" min="0" value={form.weight_kg} onChange={(e) => setField('weight_kg', e.target.value)} /></label>
          <label>Altura cm<input type="number" step="0.1" min="0" value={form.height_cm} onChange={(e) => setField('height_cm', e.target.value)} /></label>
          <label>Documento / prueba URL<input type="url" value={form.document_url} onChange={(e) => setField('document_url', e.target.value)} /></label>
          <label className="full-span">Notas clinicas<textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} rows="5" /></label>
          {error && <p className="form-error full-span">{error}</p>}
          <div className="form-actions full-span">
            <button className="primary-button" disabled={saving}><Save size={18} /> {saving ? 'Guardando...' : 'Guardar registro'}</button>
          </div>
        </form>

        <section className="records-list">
          <h2>Registros existentes</h2>
          {records.length === 0 ? <p className="muted">Sin datos clinicos registrados.</p> : null}
          {records.map((record) => (
            <article className="record-card" key={record.id}>
              <div className="record-icon"><Stethoscope size={18} /></div>
              <div>
                <h3>{record.record_type}</h3>
                <p>{record.notes || 'Sin observaciones'}</p>
                <div className="record-meta">
                  {record.weight_kg ? <span><Scale size={14} /> {record.weight_kg} kg</span> : null}
                  {record.height_cm ? <span><Ruler size={14} /> {record.height_cm} cm</span> : null}
                  {record.document_url ? <a href={record.document_url}><FileText size={14} /> Documento</a> : null}
                </div>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  )
}
