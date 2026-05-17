import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Activity, Bug, FileText, FlaskConical, Pill, Ruler, Scale, Scissors, ShieldPlus, Stethoscope, Trash2 } from 'lucide-react'
import { supabase } from '../../../shared/lib/supabaseClient.js'
import { createPetPhotoSignedUrl } from '../../../shared/lib/petPhotos.js'

const MEDICAL_TABS = [
  { id: 'overview', label: 'Resumen', icon: Activity, types: [] },
  { id: 'clinical', label: 'Consultas', icon: Stethoscope, types: ['consulta'] },
  { id: 'analysis', label: 'Analisis', icon: FlaskConical, types: ['analisis clinico'] },
  { id: 'deworming', label: 'Desparasitacion', icon: Bug, types: ['desparasitacion'] },
  { id: 'surgery', label: 'Cirugias y radiografias', icon: Scissors, types: ['cirugia', 'radiografia'] },
  { id: 'vaccines', label: 'Vacunas', icon: ShieldPlus, types: ['vacuna'] },
  { id: 'other', label: 'Otros', icon: Pill, types: ['otro'] },
]

function normalizeType(type = '') {
  return type.trim().toLowerCase()
}

export default function PetDetail() {
  const { petId } = useParams()
  const navigate = useNavigate()
  const [pet, setPet] = useState(null)
  const [records, setRecords] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: petData }, { data: recordData }] = await Promise.all([
        supabase.from('pets').select('*').eq('id', petId).single(),
        supabase.from('medical_records').select('*').eq('pet_id', petId).order('recorded_at', { ascending: false }),
      ])
      setPet(petData
        ? {
            ...petData,
            photoSignedUrl: await createPetPhotoSignedUrl(petData.photo_url),
          }
        : null)
      setRecords(recordData || [])
      setLoading(false)
    }

    load()
  }, [petId])

  async function handleDeletePet() {
    const confirmed = window.confirm(`Borrar la ficha de ${pet.name} y todos sus datos medicos? Esta accion no se puede deshacer.`)
    if (!confirmed) return

    const { error } = await supabase.from('pets').delete().eq('id', petId)
    if (error) {
      window.alert(error.message)
      return
    }

    navigate('/mascotas', { replace: true })
  }

  if (loading) return <main className="page"><p>Cargando ficha...</p></main>
  if (!pet) return <main className="page"><p>Mascota no encontrada.</p></main>

  const currentTab = MEDICAL_TABS.find((tab) => tab.id === activeTab) || MEDICAL_TABS[0]
  const visibleRecords = activeTab === 'overview'
    ? records
    : records.filter((record) => currentTab.types.includes(normalizeType(record.record_type)))
  const latestWeight = records.find((record) => record.weight_kg)
  const latestHeight = records.find((record) => record.height_cm)

  return (
    <main className="page">
      <header className="pet-profile">
        <div className="pet-photo large">
          {pet.photoSignedUrl ? <img src={pet.photoSignedUrl} alt={pet.name} /> : <Stethoscope size={44} />}
        </div>
        <div>
          <span className="eyebrow">{pet.animal_type}</span>
          <h1>{pet.name}</h1>
          <p>{pet.breed || 'Raza no indicada'} · Chip: {pet.chip_number || 'sin chip'}</p>
          <p>Seguro: {pet.insurance_company || 'No indicado'} {pet.policy_number ? `· Poliza ${pet.policy_number}` : ''}</p>
        </div>
        <button className="danger-button pet-delete-button" type="button" onClick={handleDeletePet}>
          <Trash2 size={18} />
          Borrar mascota
        </button>
      </header>

      <section className="pet-summary-grid">
        <article className="summary-card">
          <span>Fecha de nacimiento</span>
          <strong>{pet.birth_date || 'No indicada'}</strong>
        </article>
        <article className="summary-card">
          <span>Ultimo peso</span>
          <strong>{latestWeight?.weight_kg ? `${latestWeight.weight_kg} kg` : 'Sin registro'}</strong>
        </article>
        <article className="summary-card">
          <span>Ultima altura</span>
          <strong>{latestHeight?.height_cm ? `${latestHeight.height_cm} cm` : 'Sin registro'}</strong>
        </article>
      </section>

      <nav className="tabs" aria-label="Categorias medicas">
        {MEDICAL_TABS.map(({ id, label, icon: Icon }) => (
          <button
            className={activeTab === id ? 'tab-button active' : 'tab-button'}
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      <section className="records-list">
        <h2>{currentTab.label}</h2>
        {visibleRecords.length === 0 ? <p className="muted">No hay registros en esta categoria.</p> : null}
        {visibleRecords.map((record) => (
          <article className="record-card" key={record.id}>
            <div className="record-icon"><Activity size={18} /></div>
            <div>
              <h3>{record.record_type}</h3>
              <p>{record.notes || 'Sin observaciones'}</p>
              <div className="record-meta">
                {record.weight_kg ? <span><Scale size={14} /> {record.weight_kg} kg</span> : null}
                {record.height_cm ? <span><Ruler size={14} /> {record.height_cm} cm</span> : null}
                {record.document_url ? <a href={record.document_url}><FileText size={14} /> Documento</a> : null}
                <span>{new Date(record.recorded_at).toLocaleDateString('es-ES')}</span>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
