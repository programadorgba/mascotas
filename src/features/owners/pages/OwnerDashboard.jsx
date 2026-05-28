import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarDays, Microchip, PawPrint, Plus } from 'lucide-react'
import { supabase } from '../../../shared/lib/supabaseClient.js'
import { useAuth } from '../../../shared/context/AuthContext.jsx'
import { addPetPhotoSignedUrls } from '../../../shared/lib/petPhotos.js'
import CalendarPage from '../../reminders/pages/CalendarPage.jsx'
import { PASTEL_COLORS } from '../../reminders/constants.js'

export default function OwnerDashboard() {
  const { user, profile } = useAuth()
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPets() {
      const { data } = await supabase
        .from('pets')
        .select('id, name, animal_type, sex, breed, chip_number, birth_date, photo_url, color, allergies')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      setPets(await addPetPhotoSignedUrls(data))
      setLoading(false)
    }

    loadPets()
  }, [user.id])

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <span style={{color: 'var(--text)', fontSize: '1.5rem', fontWeight: 700}}>{profile?.full_name || 'Propietario'}</span>
          <h1>Mis mascotas</h1>
          <p>Fichas privadas con datos de identificacion, seguro y salud.</p>
        </div>
        <Link className="primary-button" to="/mascotas/nueva"><Plus size={18} /> Nueva mascota</Link>
      </header>

      {loading ? <p>Cargando mascotas...</p> : null}

      {!loading && pets.length === 0 ? (
        <section className="empty-state">
          <PawPrint size={38} />
          <h2>Aun no hay mascotas</h2>
          <p>Registra la primera ficha para empezar a centralizar su salud.</p>
          <Link className="primary-button" to="/mascotas/nueva">Crear ficha</Link>
        </section>
      ) : null}

      {pets.length > 0 && (
        <section className="pet-grid pet-grid-two">
          {pets.map((pet, i) => (
            <Link className="pet-card" key={pet.id} to={`/mascotas/${pet.id}`}>
              <div className="pet-card-left">
                <div className="pet-photo">
                  {pet.photoSignedUrl ? <img src={pet.photoSignedUrl} alt={pet.name} /> : <PawPrint size={32} />}
                </div>
                <span className="pet-color-dot" style={{ backgroundColor: pet.color || PASTEL_COLORS[i % PASTEL_COLORS.length] }} />
              </div>
              <div className="pet-card-info">
                <div className="pet-card-header">
                  <h2>{pet.name}</h2>
                  <p>{[pet.animal_type, pet.sex, pet.breed].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="pet-card-divider" />
                <div className="pet-card-data">
                  {pet.color && (
                    <div className="pet-data-row">
                      <PawPrint size={14} />
                      <span className="pet-data-label">Color</span>
                      <span className="pet-data-value">{pet.color}</span>
                    </div>
                  )}
                  <div className="pet-data-row">
                    <Microchip size={14} />
                    <span className="pet-data-label">Chip</span>
                    <span className="pet-data-value">{pet.chip_number || 'Sin chip'}</span>
                  </div>
                  <div className="pet-data-row">
                    <CalendarDays size={14} />
                    <span className="pet-data-label">Nac</span>
                    <span className="pet-data-value">{pet.birth_date || 'No indicado'}</span>
                  </div>
                  {pet.allergies && (
                    <div className="pet-data-row error-row">
                      <AlertTriangle size={14} />
                      <span className="pet-data-label">Alergias</span>
                      <span className="pet-data-value">{pet.allergies}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}

      <CalendarPage />
    </main>
  )
}
