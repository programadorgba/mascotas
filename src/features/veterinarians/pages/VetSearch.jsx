import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Microchip, Search, Stethoscope } from 'lucide-react'
import { supabase } from '../../../shared/lib/supabaseClient.js'

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

    const { data, error: searchError } = await supabase
      .from('pets')
      .select('id, name, animal_type, breed, chip_number, birth_date, photo_url')
      .eq('chip_number', chip.trim())
      .maybeSingle()

    setLoading(false)

    if (searchError) {
      setError(searchError.message)
      return
    }

    if (!data) {
      setError('No se ha encontrado ninguna mascota con ese chip.')
      return
    }

    setPet(data)
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
            <input value={chip} onChange={(e) => setChip(e.target.value)} required placeholder="Ej. 985123456789012" />
          </div>
        </label>
        <button className="primary-button" disabled={loading}><Search size={18} /> {loading ? 'Buscando...' : 'Buscar'}</button>
      </form>

      {error && <p className="form-error">{error}</p>}

      {pet ? (
        <article className="pet-card result-card">
          <div className="pet-photo">
            {pet.photo_url ? <img src={pet.photo_url} alt={pet.name} /> : <Stethoscope size={32} />}
          </div>
          <div>
            <h2>{pet.name}</h2>
            <p>{pet.animal_type}{pet.breed ? ` · ${pet.breed}` : ''}</p>
            <span><Microchip size={14} /> {pet.chip_number}</span>
          </div>
          <Link className="primary-button" to={`/veterinario/mascotas/${pet.id}`}>Abrir historial</Link>
        </article>
      ) : null}
    </main>
  )
}
