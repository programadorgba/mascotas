import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Microchip, Search, Stethoscope } from 'lucide-react'
import { supabase } from '../../../shared/lib/supabaseClient.js'
import { normalizeChip } from '../../../shared/lib/chip.js'
import { createPetPhotoSignedUrl } from '../../../shared/lib/petPhotos.js'

export default function VetSearch() {
  const [chip, setChip] = useState('')
  const [pet, setPet] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSearch(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setPet(null)
    const normalizedChip = normalizeChip(chip)

    if (!normalizedChip) {
      setLoading(false)
      setError('Introduce un numero de chip valido.')
      return
    }

    const { data, error: searchError } = await supabase
      .from('pets')
      .select('id, name, animal_type, sex, breed, chip_number, birth_date, photo_url')
      .eq('chip_number', normalizedChip)
      .maybeSingle()

    if (searchError) {
      setLoading(false)
      setError(searchError.message)
      return
    }

    if (!data) {
      setLoading(false)
      setError('No se ha encontrado ninguna mascota con ese chip.')
      return
    }

    setPet({
      ...data,
      photoSignedUrl: await createPetPhotoSignedUrl(data.photo_url),
    })
    setLoading(false)
  }

  return (
    <main className="page page-narrow">
      <header className="page-header">
        <div>
          <span className="eyebrow">Veterinarios</span>
          <h1>Buscar por chip</h1>
          <p>Introduce el microchip para abrir la ficha clinica y registrar datos medicos.</p>
        </div>
      </header>

      <form className="data-card chip-search" onSubmit={handleSearch}>
        <label>
          Numero de chip
          <div className="input-with-icon">
            <Microchip size={18} />
            <input value={chip} onChange={(e) => setChip(e.target.value)} required inputMode="numeric" placeholder="Ej. 985123456789012" />
          </div>
        </label>
        <button className="primary-button" disabled={loading}><Search size={18} /> {loading ? 'Buscando...' : 'Buscar'}</button>
      </form>

      {error && <p className="form-error">{error}</p>}

      {pet ? (
        <article className="pet-card result-card">
          <div className="pet-photo">
            {pet.photoSignedUrl ? <img src={pet.photoSignedUrl} alt={pet.name} /> : <Stethoscope size={32} />}
          </div>
          <div>
            <h2>{pet.name}</h2>
            <p>{pet.animal_type}{pet.sex ? ` · ${pet.sex}` : ''}{pet.breed ? ` · ${pet.breed}` : ''}</p>
            <span><Microchip size={14} /> {pet.chip_number}</span>
          </div>
          <Link className="primary-button" to={`/veterinario/mascotas/${pet.id}`}>Abrir historial</Link>
        </article>
      ) : null}
    </main>
  )
}
