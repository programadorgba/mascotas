import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Save, X } from 'lucide-react'
import { supabase } from '../../../shared/lib/supabaseClient.js'
import { useAuth } from '../../../shared/context/AuthContext.jsx'
import { normalizeChip } from '../../../shared/lib/chip.js'
import { PET_PHOTOS_BUCKET } from '../../../shared/lib/petPhotos.js'
import { PASTEL_COLORS } from '../../reminders/constants.js'

const MAX_PHOTO_SIZE = 5 * 1024 * 1024

const initialForm = {
  name: '',
  animal_type: 'Perro',
  sex: 'No especificado',
  breed: '',
  chip_number: '',
  insurance_company: '',
  policy_number: '',
  birth_date: '',
  color: '',
  allergies: '',
}

export default function PetForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // ✅ FIX 2: cleanup del object URL al desmontar o cambiar preview
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen.')
      return
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setError('La foto no puede superar 5 MB.')
      return
    }

    setError('')
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function clearPhoto() {
    setPhotoFile(null)
    // El useEffect se encarga de revocar la URL al cambiar photoPreview
    setPhotoPreview('')
  }

  async function uploadPetPhoto(petId) {
    if (!photoFile) return null

    const extension = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filePath = `${user.id}/${petId}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from(PET_PHOTOS_BUCKET)
      .upload(filePath, photoFile, {
        cacheControl: '3600',
        contentType: photoFile.type,
        upsert: true,
      })

    if (uploadError) throw uploadError

    return filePath
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const normalizedChip = normalizeChip(form.chip_number)

    try {
      // Remove automatic color generation to allow user input
      // If user leaves color empty, we default to #0000B8 or a standard fallback
      const finalColor = form.color.trim() || '#0000B8'

      const { data, error: insertError } = await supabase
        .from('pets')
        .insert({
          owner_id: user.id,
          name: form.name.trim(),
          animal_type: form.animal_type,
          sex: form.sex,                                    // ✅ ya estaba, pero ahora la columna existe
          breed: form.breed.trim() || null,
          chip_number: normalizedChip || null,
          insurance_company: form.insurance_company.trim() || null,
          policy_number: form.policy_number.trim() || null,
          birth_date: form.birth_date || null,
          color: finalColor,
          allergies: form.allergies.trim() || null,
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      const photoPath = await uploadPetPhoto(data.id)
      if (photoPath) {
        const { error: updateError } = await supabase
          .from('pets')
          .update({ photo_url: photoPath })
          .eq('id', data.id)

        if (updateError) throw updateError
      }

      navigate(`/mascotas/${data.id}`)
    } catch (saveError) {
      setError(saveError.message || 'No se pudo guardar la mascota.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page page-narrow">
      <header className="page-header">
        <div>
          <span className="eyebrow">Nueva ficha</span>
          <h1>Datos de la mascota</h1>
          <p>Identificacion, seguro y nacimiento. Los datos medicos los introduce un veterinario autorizado.</p>
        </div>
      </header>

      <form className="data-card form-grid pet-form" onSubmit={handleSubmit}>
        <label className="photo-upload photo-upload-hero full-span">
          Foto de la mascota
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoChange} />
          <span className="photo-upload-box">
            {photoPreview ? (
              <>
                <img src={photoPreview} alt="Vista previa de la mascota" />
                <button className="icon-button remove-photo" type="button" onClick={clearPhoto} aria-label="Quitar foto">
                  <X size={16} />
                </button>
              </>
            ) : (
              <span className="photo-placeholder">
                <Camera size={28} />
                Seleccionar imagen hasta 5 MB
              </span>
            )}
          </span>
        </label>

        <label>Nombre<input required value={form.name} onChange={(e) => setField('name', e.target.value)} /></label>
        <label>Tipo de animal
          <select value={form.animal_type} onChange={(e) => setField('animal_type', e.target.value)}>
            <option>Perro</option>
            <option>Gato</option>
            <option>Ave</option>
            <option>Conejo</option>
            <option>Reptil</option>
            <option>Otro</option>
          </select>
        </label>
        <label>Sexo
          <select value={form.sex} onChange={(e) => setField('sex', e.target.value)}>
            <option value="Macho">Macho</option>
            <option value="Hembra">Hembra</option>
            <option value="No especificado">No especificado</option>
          </select>
        </label>
        <label>Raza<input value={form.breed} onChange={(e) => setField('breed', e.target.value)} /></label>
        <label>Color (Ej. Negro, Blanco, Marrón, Gris)<input value={form.color} onChange={(e) => setField('color', e.target.value)} placeholder="Opcional" /></label>
        <label>Dia de nacimiento<input type="date" value={form.birth_date} onChange={(e) => setField('birth_date', e.target.value)} /></label>
        <label>N chip<input value={form.chip_number} onChange={(e) => setField('chip_number', e.target.value)} inputMode="numeric" maxLength={32} /></label>
        <label>Compania de seguro<input value={form.insurance_company} onChange={(e) => setField('insurance_company', e.target.value)} /></label>
        <label>N poliza<input value={form.policy_number} onChange={(e) => setField('policy_number', e.target.value)} /></label>
        <label className="full-span">Alergias conocidas<input value={form.allergies} onChange={(e) => setField('allergies', e.target.value)} placeholder="Ej. Penicilina (Opcional)" /></label>

        {error && <p className="form-error full-span">{error}</p>}

        <div className="form-actions full-span">
          <button className="secondary-button" type="button" onClick={() => navigate('/mascotas')}>Cancelar</button>
          <button className="primary-button" disabled={saving}><Save size={18} /> {saving ? 'Guardando...' : 'Guardar mascota'}</button>
        </div>
      </form>
    </main>
  )
}
