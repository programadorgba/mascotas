import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  ImagePlus,
  Pill,
  Plus,
  Ruler,
  Save,
  Scale,
  Stethoscope,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { supabase } from '../../../shared/lib/supabaseClient.js'
import { useAuth } from '../../../shared/context/AuthContext.jsx'
import { createPetPhotoSignedUrl } from '../../../shared/lib/petPhotos.js'
import { DIAGNOSTIC_IMAGING_BUCKET } from '../../../shared/lib/diagnosticImaging.js'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024

const STUDY_TYPES  = ['Radiografia', 'Ecografia', 'TAC', 'Resonancia', 'Otra']
const VISIT_STATUS = ['pendiente', 'confirmada', 'completada', 'cancelada']

const STATUS_COLORS = {
  pendiente:   { bg: '#fff8e1', color: '#d98a2b', label: 'Pendiente'   },
  confirmada:  { bg: '#e3f2fd', color: '#1565c0', label: 'Confirmada'  },
  completada:  { bg: '#e8f5e9', color: '#2e7d32', label: 'Completada'  },
  cancelada:   { bg: '#fce4ec', color: '#c62828', label: 'Cancelada'   },
}

// ─── Estado inicial del formulario de visita ─────────────────
const emptyVisit = {
  visited_at:      new Date().toISOString().split('T')[0],
  status:          'completada',
  reason:          '',
  examination:     '',
  diagnosis:       '',
  treatment_notes: '',
  weight_kg:       '',
  height_cm:       '',
  next_visit_date: '',
  signed_by:       '',
}

const emptyMed = {
  name:       '',
  dosage:     '',
  frequency:  '',
  start_date: '',
  end_date:   '',
  with_food:  false,
  fasting:    false,
  notes:      '',
}

const emptyImaging = {
  study_type: 'Radiografia',
  taken_at:   '',
  report:     '',
  file:       null,
  preview:    '',
}

// ─── Helpers ─────────────────────────────────────────────────
function formatDate(value) {
  if (!value) return '—'
  const normalized = String(value).length === 10 ? `${value}T12:00:00` : value
  return new Date(normalized).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pendiente
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      padding:      '2px 10px',
      borderRadius: 20,
      fontSize:     12,
      fontWeight:   700,
      background:   s.bg,
      color:        s.color,
    }}>
      {s.label}
    </span>
  )
}

// ─── Componente principal ─────────────────────────────────────
export default function VetPetRecord() {
  const { petId }   = useParams()
  const { user }    = useAuth()

  const [pet,        setPet]        = useState(null)
  const [visits,     setVisits]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [expandedId, setExpandedId] = useState(null)

  // Formulario visita
  const [visitForm,  setVisitForm]  = useState(emptyVisit)

  // Medicaciones dentro de la visita (array)
  const [meds,       setMeds]       = useState([])

  // Imágenes dentro de la visita (array)
  const [images,     setImages]     = useState([])

  // ─── Carga de datos ────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)

    const [{ data: petData }, { data: visitsData }] = await Promise.all([
      supabase
        .from('pets')
        .select('id, name, animal_type, sex, breed, chip_number, photo_url, allergies, birth_date')
        .eq('id', petId)
        .single(),
      supabase
        .from('visits')
        .select(`
          *,
          visit_medications (*),
          visit_imaging (*)
        `)
        .eq('pet_id', petId)
        .order('visited_at', { ascending: false }),
    ])

    if (petData) {
      setPet({ ...petData, photoSignedUrl: await createPetPhotoSignedUrl(petData.photo_url) })
    }

    // Generar signed URLs para imágenes
    const visitsWithUrls = await Promise.all(
      (visitsData || []).map(async (v) => ({
        ...v,
        visit_imaging: await Promise.all(
          (v.visit_imaging || []).map(async (img) => {
            const { data } = await supabase.storage
              .from(DIAGNOSTIC_IMAGING_BUCKET)
              .createSignedUrl(img.image_path, 3600)
            return { ...img, signedUrl: data?.signedUrl || null }
          })
        ),
      }))
    )

    setVisits(visitsWithUrls)
    setLoading(false)
  }, [petId])

  useEffect(() => { loadData() }, [loadData])

  // Limpiar previews al desmontar
  useEffect(() => {
    return () => images.forEach(img => { if (img.preview) URL.revokeObjectURL(img.preview) })
  }, [images])

  // ─── Formulario ────────────────────────────────────────────
  function setVF(field, value) {
    setVisitForm(f => ({ ...f, [field]: value }))
  }

  function addMed() {
    setMeds(m => [...m, { ...emptyMed, _id: crypto.randomUUID() }])
  }

  function setMedField(idx, field, value) {
    setMeds(m => m.map((med, i) => i === idx ? { ...med, [field]: value } : med))
  }

  function removeMed(idx) {
    setMeds(m => m.filter((_, i) => i !== idx))
  }

  function addImage() {
    setImages(i => [...i, { ...emptyImaging, _id: crypto.randomUUID() }])
  }

  function setImageField(idx, field, value) {
    setImages(imgs => imgs.map((img, i) => i === idx ? { ...img, [field]: value } : img))
  }

  function handleImageFile(idx, file) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Selecciona una imagen válida.'); return }
    if (file.size > MAX_IMAGE_SIZE) { setError('La imagen no puede superar 10 MB.'); return }
    const preview = URL.createObjectURL(file)
    setImages(imgs => imgs.map((img, i) => i === idx ? { ...img, file, preview } : img))
  }

  function removeImage(idx) {
    const img = images[idx]
    if (img.preview) URL.revokeObjectURL(img.preview)
    setImages(imgs => imgs.filter((_, i) => i !== idx))
  }

  function resetForm() {
    setVisitForm(emptyVisit)
    setMeds([])
    images.forEach(img => { if (img.preview) URL.revokeObjectURL(img.preview) })
    setImages([])
    setError('')
  }

  // ─── Guardar visita completa ────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      // 1. Insertar visita
      const { data: visitData, error: visitError } = await supabase
        .from('visits')
        .insert({
          pet_id:          petId,
          created_by:      user.id,
          vet_id:          user.id,
          visited_at:      visitForm.visited_at,
          status:          visitForm.status,
          reason:          visitForm.reason.trim()          || null,
          examination:     visitForm.examination.trim()     || null,
          diagnosis:       visitForm.diagnosis.trim()       || null,
          treatment_notes: visitForm.treatment_notes.trim() || null,
          weight_kg:       visitForm.weight_kg ? Number(visitForm.weight_kg) : null,
          height_cm:       visitForm.height_cm ? Number(visitForm.height_cm) : null,
          next_visit_date: visitForm.next_visit_date        || null,
          signed_by:       visitForm.signed_by.trim()       || null,
        })
        .select('id')
        .single()

      if (visitError) throw visitError
      const visitId = visitData.id

      // 2. Insertar medicaciones
      if (meds.length > 0) {
        const medsPayload = meds
          .filter(m => m.name.trim() && m.dosage.trim() && m.frequency.trim() && m.start_date)
          .map(m => ({
            visit_id:      visitId,
            pet_id:        petId,
            prescribed_by: user.id,
            name:          m.name.trim(),
            dosage:        m.dosage.trim(),
            frequency:     m.frequency.trim(),
            start_date:    m.start_date,
            end_date:      m.end_date || null,
            with_food:     m.with_food,
            fasting:       m.fasting,
            notes:         m.notes.trim() || null,
            active:        true,
          }))

        if (medsPayload.length > 0) {
          const { error: medError } = await supabase.from('visit_medications').insert(medsPayload)
          if (medError) throw medError
        }
      }

      // 3. Subir imágenes e insertar registros
      for (const img of images) {
        if (!img.file || !img.taken_at) continue

        const ext      = img.file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const safeType = img.study_type.toLowerCase().replace(/\s+/g, '-')
        const filePath = `${petId}/${visitId}-${safeType}-${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from(DIAGNOSTIC_IMAGING_BUCKET)
          .upload(filePath, img.file, { contentType: img.file.type, upsert: false })

        if (uploadError) throw uploadError

        const { error: imgError } = await supabase.from('visit_imaging').insert({
          visit_id:   visitId,
          pet_id:     petId,
          vet_id:     user.id,
          study_type: img.study_type,
          image_path: filePath,
          report:     img.report.trim() || null,
          taken_at:   `${img.taken_at}T12:00:00`,
        })

        if (imgError) throw imgError
      }

      resetForm()
      setShowForm(false)
      await loadData()
      setExpandedId(visitId)

    } catch (err) {
      setError(err.message || 'No se pudo guardar la visita.')
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────
  if (loading) return <main className="page"><p>Cargando ficha veterinaria...</p></main>
  if (!pet)    return <main className="page"><p>Mascota no encontrada.</p></main>

  return (
    <main className="page">

      {/* ── Cabecera mascota ── */}
      <header className="pet-profile pet-profile-clinical">
        <div className="pet-photo large">
          {pet.photoSignedUrl
            ? <img src={pet.photoSignedUrl} alt={pet.name} />
            : <Stethoscope size={44} />}
        </div>
        <div style={{ flex: 1 }}>
          <span className="eyebrow">Ficha clínica</span>
          <h1>{pet.name}</h1>
          <p>
            {pet.animal_type}
            {pet.sex    ? ` · ${pet.sex}`   : ''}
            {pet.breed  ? ` · ${pet.breed}` : ''}
            {pet.chip_number ? ` · Chip ${pet.chip_number}` : ''}
          </p>
          <div className="clinical-quick-stats">
            <span>{visits.length} visitas</span>
            <span>
              {visits.reduce((acc, v) => acc + (v.visit_medications?.length || 0), 0)} medicaciones
            </span>
            <span>
              {visits.reduce((acc, v) => acc + (v.visit_imaging?.length || 0), 0)} estudios
            </span>
          </div>
        </div>
      </header>

      {/* ── Banner alergias ── */}
      {pet.allergies && (
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          12,
          padding:      '14px 20px',
          borderRadius: 10,
          background:   '#fff3e0',
          border:       '1.5px solid #f0a850',
          marginBottom: 20,
        }}>
          <AlertTriangle size={20} color="#d98a2b" style={{ flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#d98a2b', textTransform: 'uppercase', letterSpacing: 1 }}>
              Alergias conocidas
            </span>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#5d3a00' }}>
              {pet.allergies}
            </p>
          </div>
        </div>
      )}

      {/* ── Botón nueva visita ── */}
      {!showForm && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button
            className="primary-button"
            type="button"
            onClick={() => { resetForm(); setShowForm(true) }}
          >
            <Plus size={18} /> Nueva visita
          </button>
        </div>
      )}

      {/* ── Formulario nueva visita ── */}
      {showForm && (
        <form
          className="data-card"
          onSubmit={handleSubmit}
          style={{ marginBottom: 28 }}
        >
          {/* Cabecera del formulario */}
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            marginBottom:   24,
            paddingBottom:  16,
            borderBottom:   '1px solid var(--line)',
          }}>
            <div>
              <span className="eyebrow">Registro clínico</span>
              <h2 style={{ margin: 0 }}>Nueva visita — {pet.name}</h2>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => { resetForm(); setShowForm(false) }}
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Fila 1: fecha, estado, peso, altura, firma ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            <label>Fecha de visita
              <input
                type="date"
                value={visitForm.visited_at}
                onChange={e => setVF('visited_at', e.target.value)}
                required
              />
            </label>
            <label>Estado
              <select value={visitForm.status} onChange={e => setVF('status', e.target.value)}>
                {VISIT_STATUS.map(s => (
                  <option key={s} value={s}>{STATUS_COLORS[s]?.label || s}</option>
                ))}
              </select>
            </label>
            <label>Firmado por
              <input
                value={visitForm.signed_by}
                onChange={e => setVF('signed_by', e.target.value)}
                placeholder="Dr. García / Clínica PetCare"
              />
            </label>
            <label>Peso kg
              <input
                type="number" step="0.01" min="0"
                value={visitForm.weight_kg}
                onChange={e => setVF('weight_kg', e.target.value)}
                placeholder="14.6"
              />
            </label>
            <label>Altura cm
              <input
                type="number" step="0.1" min="0"
                value={visitForm.height_cm}
                onChange={e => setVF('height_cm', e.target.value)}
                placeholder="45"
              />
            </label>
            <label>Próxima visita
              <input
                type="date"
                value={visitForm.next_visit_date}
                onChange={e => setVF('next_visit_date', e.target.value)}
              />
            </label>
          </div>

          {/* ── Campos clínicos ── */}
          <div style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
            <label>Motivo de consulta
              <textarea
                rows={2}
                value={visitForm.reason}
                onChange={e => setVF('reason', e.target.value)}
                placeholder="¿Por qué acude la mascota hoy?"
              />
            </label>
            <label>Exploración y hallazgos
              <textarea
                rows={4}
                value={visitForm.examination}
                onChange={e => setVF('examination', e.target.value)}
                placeholder="Exploración física, anamnesis, constantes, hallazgos relevantes..."
              />
            </label>
            <label>Diagnóstico
              <textarea
                rows={3}
                value={visitForm.diagnosis}
                onChange={e => setVF('diagnosis', e.target.value)}
                placeholder="Diagnóstico principal y diferencial..."
              />
            </label>
            <label>Notas de tratamiento
              <textarea
                rows={3}
                value={visitForm.treatment_notes}
                onChange={e => setVF('treatment_notes', e.target.value)}
                placeholder="Indicaciones, recomendaciones al propietario, seguimiento..."
              />
            </label>
          </div>

          {/* ── Medicaciones ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
              marginBottom:   12,
              paddingBottom:  10,
              borderBottom:   '1px solid var(--line)',
            }}>
              <div>
                <span className="eyebrow">Tratamiento</span>
                <h3 style={{ margin: 0 }}>Medicaciones recetadas</h3>
              </div>
              <button type="button" className="secondary-button" onClick={addMed}>
                <Plus size={16} /> Añadir medicación
              </button>
            </div>

            {meds.length === 0 && (
              <p className="muted" style={{ fontSize: 13 }}>
                Sin medicaciones en esta visita. Pulsa "Añadir medicación" si es necesario.
              </p>
            )}

            {meds.map((med, idx) => (
              <div
                key={med._id}
                style={{
                  display:      'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap:          12,
                  padding:      16,
                  borderRadius: 10,
                  border:       '1px solid var(--line)',
                  background:   'var(--surface-soft)',
                  marginBottom: 12,
                  position:     'relative',
                }}
              >
                <button
                  type="button"
                  onClick={() => removeMed(idx)}
                  style={{
                    position:   'absolute', top: 10, right: 10,
                    border:     'none', background: 'transparent',
                    color:      'var(--red)', cursor: 'pointer', padding: 4,
                  }}
                >
                  <Trash2 size={14} />
                </button>

                <label>Medicamento
                  <input
                    value={med.name}
                    onChange={e => setMedField(idx, 'name', e.target.value)}
                    placeholder="Doxiciclina 100mg"
                    required
                  />
                </label>
                <label>Dosis
                  <input
                    value={med.dosage}
                    onChange={e => setMedField(idx, 'dosage', e.target.value)}
                    placeholder="350mg, 1 comprimido"
                    required
                  />
                </label>
                <label>Frecuencia
                  <input
                    value={med.frequency}
                    onChange={e => setMedField(idx, 'frequency', e.target.value)}
                    placeholder="cada 12h, 1 vez al día"
                    required
                  />
                </label>
                <label>Fecha inicio
                  <input
                    type="date"
                    value={med.start_date}
                    onChange={e => setMedField(idx, 'start_date', e.target.value)}
                    required
                  />
                </label>
                <label>Fecha fin
                  <input
                    type="date"
                    value={med.end_date}
                    onChange={e => setMedField(idx, 'end_date', e.target.value)}
                    min={med.start_date}
                  />
                </label>
                <label>Notas
                  <input
                    value={med.notes}
                    onChange={e => setMedField(idx, 'notes', e.target.value)}
                    placeholder="Con comida, en ayunas..."
                  />
                </label>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', paddingTop: 8 }}>
                  <label style={{ flexDirection: 'row', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      style={{ width: 'auto' }}
                      checked={med.with_food}
                      onChange={e => setMedField(idx, 'with_food', e.target.checked)}
                    />
                    Con comida
                  </label>
                  <label style={{ flexDirection: 'row', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      style={{ width: 'auto' }}
                      checked={med.fasting}
                      onChange={e => setMedField(idx, 'fasting', e.target.checked)}
                    />
                    En ayunas
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* ── Imágenes diagnósticas ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
              marginBottom:   12,
              paddingBottom:  10,
              borderBottom:   '1px solid var(--line)',
            }}>
              <div>
                <span className="eyebrow">Diagnóstico por imagen</span>
                <h3 style={{ margin: 0 }}>Estudios adjuntos</h3>
              </div>
              <button type="button" className="secondary-button" onClick={addImage}>
                <Plus size={16} /> Añadir imagen
              </button>
            </div>

            {images.length === 0 && (
              <p className="muted" style={{ fontSize: 13 }}>
                Sin estudios de imagen en esta visita.
              </p>
            )}

            {images.map((img, idx) => (
              <div
                key={img._id}
                style={{
                  display:      'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap:          12,
                  padding:      16,
                  borderRadius: 10,
                  border:       '1px solid var(--line)',
                  background:   'var(--surface-soft)',
                  marginBottom: 12,
                  position:     'relative',
                }}
              >
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  style={{
                    position: 'absolute', top: 10, right: 10,
                    border: 'none', background: 'transparent',
                    color: 'var(--red)', cursor: 'pointer', padding: 4,
                  }}
                >
                  <Trash2 size={14} />
                </button>

                <label>Tipo de estudio
                  <select
                    value={img.study_type}
                    onChange={e => setImageField(idx, 'study_type', e.target.value)}
                  >
                    {STUDY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label>Fecha del estudio
                  <input
                    type="date"
                    value={img.taken_at}
                    onChange={e => setImageField(idx, 'taken_at', e.target.value)}
                    required
                  />
                </label>

                <label className="photo-upload" style={{ gridColumn: '1 / -1' }}>
                  Archivo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={e => handleImageFile(idx, e.target.files?.[0])}
                  />
                  <span className="photo-upload-box" style={{ minHeight: 120 }}>
                    {img.preview ? (
                      <img src={img.preview} alt="Vista previa" style={{ maxHeight: 200, objectFit: 'contain' }} />
                    ) : (
                      <span className="photo-placeholder">
                        <Upload size={20} /> Seleccionar imagen
                      </span>
                    )}
                  </span>
                </label>

                <label style={{ gridColumn: '1 / -1' }}>Informe / hallazgos
                  <textarea
                    rows={3}
                    value={img.report}
                    onChange={e => setImageField(idx, 'report', e.target.value)}
                    placeholder="Hallazgos, estructuras evaluadas, conclusión diagnóstica..."
                  />
                </label>
              </div>
            ))}
          </div>

          {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => { resetForm(); setShowForm(false) }}
            >
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              <Save size={18} />
              {saving ? 'Guardando...' : 'Guardar visita completa'}
            </button>
          </div>
        </form>
      )}

      {/* ── Historial de visitas ── */}
      <section>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800 }}>
          Historial de visitas
        </h2>

        {visits.length === 0 && !showForm && (
          <div className="empty-state data-card">
            <Calendar size={36} color="var(--muted)" />
            <p style={{ color: 'var(--muted)', marginTop: 12 }}>
              Sin visitas registradas. Crea la primera visita con el botón de arriba.
            </p>
          </div>
        )}

        {visits.map(visit => {
          const isExpanded = expandedId === visit.id
          const hasMeds    = visit.visit_medications?.length > 0
          const hasImages  = visit.visit_imaging?.length > 0

          return (
            <div
              key={visit.id}
              style={{
                background:   'var(--surface)',
                border:       '1px solid var(--line)',
                borderRadius: 12,
                marginBottom: 12,
                overflow:     'hidden',
                boxShadow:    '0 2px 8px rgba(22,47,39,0.05)',
              }}
            >
              {/* Cabecera de la visita */}
              <div
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            16,
                  padding:        '16px 20px',
                  cursor:         'pointer',
                  userSelect:     'none',
                }}
                onClick={() => setExpandedId(isExpanded ? null : visit.id)}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: 'var(--mint)', color: 'var(--teal-dark)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Stethoscope size={20} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
                      {formatDate(visit.visited_at)}
                    </span>
                    <StatusBadge status={visit.status} />
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {visit.reason || visit.diagnosis || 'Sin motivo registrado'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                  {visit.weight_kg && (
                    <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Scale size={13} /> {visit.weight_kg} kg
                    </span>
                  )}
                  {hasMeds && (
                    <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Pill size={13} /> {visit.visit_medications.length}
                    </span>
                  )}
                  {hasImages && (
                    <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ImagePlus size={13} /> {visit.visit_imaging.length}
                    </span>
                  )}
                  {isExpanded ? <ChevronUp size={18} color="var(--muted)" /> : <ChevronDown size={18} color="var(--muted)" />}
                </div>
              </div>

              {/* Detalle expandido */}
              {isExpanded && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--line)' }}>

                  {/* Constantes */}
                  {(visit.weight_kg || visit.height_cm) && (
                    <div style={{ display: 'flex', gap: 16, margin: '16px 0 12px' }}>
                      {visit.weight_kg && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
                          <Scale size={14} /> <strong>{visit.weight_kg} kg</strong>
                        </span>
                      )}
                      {visit.height_cm && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
                          <Ruler size={14} /> <strong>{visit.height_cm} cm</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Campos clínicos */}
                  {[
                    { label: 'Motivo de consulta',   value: visit.reason           },
                    { label: 'Exploración',           value: visit.examination      },
                    { label: 'Diagnóstico',           value: visit.diagnosis        },
                    { label: 'Notas de tratamiento',  value: visit.treatment_notes  },
                  ].filter(f => f.value).map(f => (
                    <div key={f.label} style={{ marginTop: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--teal-dark)', textTransform: 'uppercase', letterSpacing: 1 }}>
                        {f.label}
                      </span>
                      <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {f.value}
                      </p>
                    </div>
                  ))}

                  {/* Medicaciones */}
                  {hasMeds && (
                    <div style={{ marginTop: 20 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--teal-dark)', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Medicaciones
                      </span>
                      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                        {visit.visit_medications.map(med => (
                          <div key={med.id} style={{
                            display:      'flex',
                            gap:          12,
                            padding:      '10px 14px',
                            borderRadius: 8,
                            background:   'var(--surface-soft)',
                            border:       '1px solid var(--line)',
                          }}>
                            <Pill size={16} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
                            <div>
                              <strong style={{ fontSize: 14 }}>{med.name}</strong>
                              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                                {med.dosage} · {med.frequency}
                                {med.with_food ? ' · Con comida' : ''}
                                {med.fasting   ? ' · En ayunas'  : ''}
                              </p>
                              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                                {formatDate(med.start_date)}
                                {med.end_date ? ` → ${formatDate(med.end_date)}` : ' · Indefinida'}
                              </p>
                              {med.notes && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>{med.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Imágenes */}
                  {hasImages && (
                    <div style={{ marginTop: 20 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--teal-dark)', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Estudios de imagen
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginTop: 8 }}>
                        {visit.visit_imaging.map(img => (
                          <div key={img.id} style={{
                            borderRadius: 10,
                            border:       '1px solid var(--line)',
                            overflow:     'hidden',
                            background:   'var(--surface-soft)',
                          }}>
                            {img.signedUrl ? (
                              <img
                                src={img.signedUrl}
                                alt={img.study_type}
                                style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                              />
                            ) : (
                              <div style={{ height: 140, display: 'grid', placeItems: 'center', background: 'var(--mint)' }}>
                                <ImagePlus size={28} color="var(--teal-dark)" />
                              </div>
                            )}
                            <div style={{ padding: '10px 12px' }}>
                              <strong style={{ fontSize: 13 }}>{img.study_type}</strong>
                              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                                {formatDate(img.taken_at)}
                              </p>
                              {img.report && (
                                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink)', lineHeight: 1.5 }}>
                                  {img.report}
                                </p>
                              )}
                              {img.signedUrl && (
                                <a
                                  href={img.signedUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="secondary-button"
                                  style={{ marginTop: 10, fontSize: 12, minHeight: 32, padding: '0 10px', display: 'inline-flex' }}
                                >
                                  <FileText size={13} /> Abrir
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Firma y próxima visita */}
                  <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                    {visit.signed_by && (
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        ✍️ <strong>{visit.signed_by}</strong>
                      </span>
                    )}
                    {visit.next_visit_date && (
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        📅 Próxima visita: <strong>{formatDate(visit.next_visit_date)}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </section>
    </main>
  )
}
