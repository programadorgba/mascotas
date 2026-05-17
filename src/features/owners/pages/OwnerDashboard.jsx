import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Microchip, PawPrint, Plus } from 'lucide-react'
import { supabase } from '../../../shared/lib/supabaseClient.js'
import { useAuth } from '../../../shared/context/AuthContext.jsx'
import { addPetPhotoSignedUrls } from '../../../shared/lib/petPhotos.js'

export default function OwnerDashboard() {
  const { user } = useAuth()
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPets() {
      const { data } = await supabase
        .from('pets')
        .select('id, name, animal_type, breed, chip_number, birth_date, photo_url')
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
          <span className="eyebrow">Propietario</span>
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

      <section className="pet-grid pet-grid-two">
        {pets.map((pet) => (
          <Link className="pet-card" key={pet.id} to={`/mascotas/${pet.id}`}>
            <div className="pet-photo">
              {pet.photoSignedUrl ? <img src={pet.photoSignedUrl} alt={pet.name} /> : <PawPrint size={32} />}
            </div>
            <div>
              <h2>{pet.name}</h2>
              <p>{pet.animal_type}{pet.breed ? ` · ${pet.breed}` : ''}</p>
              <span><Microchip size={14} /> {pet.chip_number || 'Sin chip'}</span>
              <span><CalendarDays size={14} /> {pet.birth_date || 'Nacimiento no indicado'}</span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  )
}
