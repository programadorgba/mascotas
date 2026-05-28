import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import PetForm from '../features/owners/pages/PetForm'

vi.mock('../shared/lib/supabaseClient.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
      })),
    },
  },
}))

vi.mock('../shared/context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}))

vi.mock('../shared/lib/chip.js', () => ({
  normalizeChip: vi.fn((chip) => chip),
}))

vi.mock('../shared/lib/petPhotos.js', () => ({
  PET_PHOTOS_BUCKET: 'pet-photos',
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { supabase } from '../shared/lib/supabaseClient.js'

function renderPetForm() {
  return render(
    <MemoryRouter>
      <PetForm />
    </MemoryRouter>
  )
}

describe('PetForm — crear mascota', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra todos los campos del formulario', () => {
    renderPetForm()
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo de animal')).toBeInTheDocument()
    expect(screen.getByLabelText('Sexo')).toBeInTheDocument()
    expect(screen.getByLabelText('Raza')).toBeInTheDocument()
    expect(screen.getByLabelText('N chip')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guardar mascota/i })).toBeInTheDocument()
  })

  it('muestra error si la foto supera 5MB', () => {
    renderPetForm()
    const input = document.querySelector('input[type="file"]')
    const bigFile = new File(['x'.repeat(6 * 1024 * 1024)], 'foto.jpg', { type: 'image/jpeg' })
    Object.defineProperty(bigFile, 'size', { value: 6 * 1024 * 1024 })
    fireEvent.change(input, { target: { files: [bigFile] } })
    expect(screen.getByText(/la foto no puede superar 5 mb/i)).toBeInTheDocument()
  })

  it('muestra error si el archivo no es una imagen', () => {
    renderPetForm()
    const input = document.querySelector('input[type="file"]')
    const pdfFile = new File(['contenido'], 'documento.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [pdfFile] } })
    expect(screen.getByText(/selecciona un archivo de imagen/i)).toBeInTheDocument()
  })

  it('redirige a la ficha de la mascota al guardar correctamente', async () => {
    supabase.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'pet-456' }, error: null }),
        })),
      })),
    })

    renderPetForm()
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Rex' } })
    fireEvent.change(screen.getByLabelText('Sexo'), { target: { value: 'Hembra' } })
    fireEvent.submit(document.querySelector('form'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/mascotas/pet-456')
    })
  })

  it('muestra error si falla al guardar', async () => {
    supabase.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Error de base de datos' },
          }),
        })),
      })),
    })

    renderPetForm()
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Rex' } })
    fireEvent.submit(document.querySelector('form'))

    await waitFor(() => {
      expect(screen.getByText(/error de base de datos/i)).toBeInTheDocument()
    })
  })

})
