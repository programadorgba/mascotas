import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Bug,
  ImagePlus,
  Pill,
  Ruler,
  Scale,
  Stethoscope,
  Trash2,
  X
} from 'lucide-react'
import { supabase } from '../../../shared/lib/supabaseClient.js'
import { createPetPhotoSignedUrl } from '../../../shared/lib/petPhotos.js'
import { addDiagnosticImageSignedUrls } from '../../../shared/lib/diagnosticImaging.js'

function formatDate(value) {
  if (!value) return '—'
  const normalized = String(value).length === 10 ? `${value}T12:00:00` : value
  const date = new Date(normalized)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export default function PetDetail() {
  const { petId } = useParams()
  const navigate  = useNavigate()
  const [pet,            setPet]            = useState(null)
  const [visits,         setVisits]         = useState([])
  const [selectedVisit,  setSelectedVisit]  = useState(null)
  const [loading,        setLoading]        = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: petData }, { data: visitsData }] = await Promise.all([
        supabase.from('pets').select('*').eq('id', petId).single(),
        supabase.from('visits').select(`
          *,
          visit_medications (*),
          visit_imaging (*)
        `).eq('pet_id', petId).order('visited_at', { ascending: false })
          .then(res => res)
          .catch(() => ({ data: [] }))
      ])

      setPet(
        petData
          ? { ...petData, photoSignedUrl: await createPetPhotoSignedUrl(petData.photo_url) }
          : null
      )

      if (visitsData) {
        const resolvedVisits = await Promise.all(
          visitsData.map(async (visit) => {
            if (visit.visit_imaging && visit.visit_imaging.length > 0) {
              const imagingWithUrls = await addDiagnosticImageSignedUrls(visit.visit_imaging)
              return { ...visit, visit_imaging: imagingWithUrls }
            }
            return visit
          })
        )
        setVisits(resolvedVisits)
      } else {
        setVisits([])
      }

      setLoading(false)
    }

    load()
  }, [petId])

  async function handleDeletePet() {
    const confirmed = window.confirm(
      `¿Borrar la ficha de ${pet.name} y todos sus datos médicos? Esta acción no se puede deshacer.`
    )
    if (!confirmed) return

    const { error } = await supabase.from('pets').delete().eq('id', petId)
    if (error) { window.alert(error.message); return }
    navigate('/mascotas', { replace: true })
  }

  if (loading) return <main className="page"><p>Cargando ficha...</p></main>
  if (!pet)    return <main className="page"><p>Mascota no encontrada.</p></main>

  if (selectedVisit) {
    return (
      <main className="visit-fullscreen-page">
        <header className="visit-pet-header">
          <div className="pet-info-brief">
            {pet.photoSignedUrl ? (
              <img src={pet.photoSignedUrl} alt={pet.name} className="pet-avatar-large" />
            ) : (
              <div className="pet-avatar-large fallback"><Stethoscope size={32} /></div>
            )}
            <div className="pet-data">
              <h2>{pet.name}</h2>
              <span>{pet.breed || 'Raza no indicada'} • {pet.sex || 'Sexo no especificado'}</span>
              <span className="chip-badge">Chip: {pet.chip_number || 'Sin chip'}</span>
            </div>
          </div>
          <button className="secondary-button" onClick={() => setSelectedVisit(null)}>
            <X size={18} />
            Cerrar / Volver
          </button>
        </header>

        <section className="visit-document-container">
          <article className="visit-document">
            <div className="visit-header">
              <h1>Visita — {formatDate(selectedVisit.visited_at)}</h1>
              <span className="vet-info">Veterinario: {selectedVisit.signed_by || 'Clínica PetCare'}</span>
            </div>

            <div className="visit-section vital-stats">
              <div className="stat"><strong>Peso:</strong> {selectedVisit.weight_kg ? `${selectedVisit.weight_kg} kg` : '—'}</div>
              <div className="stat"><strong>Altura:</strong> {selectedVisit.height_cm ? `${selectedVisit.height_cm} cm` : '—'}</div>
              <div className="stat"><strong>Color:</strong> {pet.color || '—'}</div>
              <div className="stat error-text"><strong>Alergias:</strong> {pet.allergies || 'Ninguna'}</div>
            </div>

            {selectedVisit.reason && (
              <div className="visit-section">
                <strong>Motivo de consulta:</strong>
                <p>{selectedVisit.reason}</p>
              </div>
            )}
            
            {selectedVisit.examination && (
              <div className="visit-section">
                <strong>Exploración y hallazgos:</strong>
                <p>{selectedVisit.examination}</p>
              </div>
            )}

            {selectedVisit.diagnosis && (
              <div className="visit-section">
                <strong>Diagnóstico:</strong>
                <p>{selectedVisit.diagnosis}</p>
              </div>
            )}

            {(selectedVisit.visit_medications?.length > 0 || selectedVisit.visit_imaging?.length > 0) && (
              <div className="visit-section extra-items">
                {selectedVisit.visit_medications?.map(med => (
                  <span key={med.id} className="tag medication">+ Medicación: {med.name}</span>
                ))}
                {selectedVisit.visit_imaging?.map(img => (
                  <span key={img.id} className="tag imaging">+ Imagen: {img.study_type}</span>
                ))}
              </div>
            )}

            {selectedVisit.visit_imaging?.length > 0 && (
              <div className="visit-section visit-images">
                {selectedVisit.visit_imaging.map(img => (
                  img.imageSignedUrl ? (
                    <img key={img.id} src={img.imageSignedUrl} alt={img.study_type} className="visit-attached-image" />
                  ) : null
                ))}
              </div>
            )}

            <div className="visit-footer">
              <span><strong>Próxima visita:</strong> {selectedVisit.next_visit_date ? formatDate(selectedVisit.next_visit_date) : '____'}</span>
              <span className="signature"><strong>Firmado:</strong> {selectedVisit.signed_by || '____________________'}</span>
            </div>
          </article>
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="pet-detail-layout">
        <section className="pet-info-card">
          <div className="pet-info-header">
            <div className="pet-info-photo">
              {pet.photoSignedUrl
                ? <img src={pet.photoSignedUrl} alt={pet.name} />
                : <Stethoscope size={44} />}
            </div>
            <div className="pet-info-content">
              <span className="eyebrow">{pet.animal_type}</span>
              <h1>{pet.name}</h1>
              <p className="pet-breed">{pet.breed || 'Raza no indicada'}</p>
            </div>
          </div>
          <div className="pet-info-grid">
            <div className="info-item">
              <span className="info-label">Sexo</span>
              <span className="info-value">{pet.sex || 'No especificado'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Fecha nacimiento</span>
              <span className="info-value">{pet.birth_date ? formatDate(pet.birth_date) : 'No indicada'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Nº Chip</span>
              <span className="info-value">{pet.chip_number || 'Sin chip'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Compañía</span>
              <span className="info-value">{pet.insurance_company || 'No indicada'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Nº Póliza</span>
              <span className="info-value">{pet.policy_number || 'No indicada'}</span>
            </div>
          </div>
          <div className="pet-info-actions">
            <button className="danger-button" type="button" onClick={handleDeletePet}>
              <Trash2 size={18} />
              Borrar
            </button>
          </div>
        </section>

        <section className="pet-vitals-card">
          <h3>Datos actuales</h3>
          <div className="vitals-grid">
            <div className="vital-item">
              <Scale size={20} />
              <div>
                <span className="vital-label">Peso</span>
                <span className="vital-value">{visits[0]?.weight_kg ? `${visits[0].weight_kg} kg` : '—'}</span>
              </div>
            </div>
            <div className="vital-item">
              <Ruler size={20} />
              <div>
                <span className="vital-label">Altura</span>
                <span className="vital-value">{visits[0]?.height_cm ? `${visits[0].height_cm} cm` : '—'}</span>
              </div>
            </div>
            <div className="vital-item allergies">
              <Bug size={20} />
              <div>
                <span className="vital-label">Alergias</span>
                <span className="vital-value">{pet.allergies || 'Ninguna'}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="records-list">
        <h2>Historial de Visitas</h2>
        {visits.length === 0 && (
          <p className="muted">No hay visitas registradas aún.</p>
        )}
        {visits.map((visit) => (
          <article className="record-card visit-list-card" key={visit.id} onClick={() => setSelectedVisit(visit)}>
            <div className="record-icon"><Stethoscope size={18} /></div>
            <div>
              <h3>Visita — {formatDate(visit.visited_at)}</h3>
              <p>{visit.reason || 'Sin motivo de consulta detallado'}</p>
              <div className="record-meta">
                {visit.weight_kg && <span><Scale size={14} /> {visit.weight_kg} kg</span>}
                {visit.visit_medications?.length > 0 && <span><Pill size={14} /> {visit.visit_medications.length} meds</span>}
                {visit.visit_imaging?.length > 0 && <span><ImagePlus size={14} /> {visit.visit_imaging.length} imgs</span>}
                <span>{visit.signed_by || 'Clínica PetCare'}</span>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}