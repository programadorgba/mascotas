import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import VetSearch from '../features/veterinarians/pages/VetSearch'
import VetPetRecord from '../features/veterinarians/pages/VetPetRecord'
import { VetRoute } from '../features/veterinarians/components/VetRoute'

// Mocks globales
vi.mock('../shared/lib/supabaseClient.js', () => ({
  supabase: { from: vi.fn() },
}))
vi.mock('../shared/lib/petPhotos.js', () => ({
  createPetPhotoSignedUrl: vi.fn(() => Promise.resolve(null)),
}))
vi.mock('../shared/lib/diagnosticImaging.js', () => ({
  DIAGNOSTIC_IMAGING_BUCKET: 'diagnostic-imaging',
  addDiagnosticImageSignedUrls: vi.fn((records) => Promise.resolve(records || [])),
}))
vi.mock('../shared/lib/chip.js', () => ({
  normalizeChip: vi.fn((chip) => chip),
}))
vi.mock('../shared/components/LoadingScreen.jsx', () => ({
  LoadingScreen: () => <p>Cargando...</p>,
}))
vi.mock('../shared/context/AuthContext.jsx', () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, isVet: false })),
}))

import { supabase } from '../shared/lib/supabaseClient.js'
import { useAuth } from '../shared/context/AuthContext.jsx'

// ─── VetSearch ───────────────────────────────────────────
describe('VetSearch — buscar por chip', () => {
  beforeEach(() => vi.clearAllMocks())

  function renderVetSearch() {
    return render(<MemoryRouter><VetSearch /></MemoryRouter>)
  }

  it('muestra el formulario de búsqueda', () => {
    renderVetSearch()
    expect(screen.getByLabelText(/numero de chip/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /buscar/i })).toBeInTheDocument()
  })

  // ... resto de pruebas de VetSearch (sin cambios)
})

// ─── VetRoute — protección de rutas ─────────────────────
describe('VetRoute — protección de rutas', () => {
  it('redirige a login si no hay usuario', () => {
    useAuth.mockReturnValue({ user: null, loading: false, isVet: false })
    render(
      <MemoryRouter initialEntries={['/veterinario']}>
        <Routes>
          <Route element={<VetRoute />}>
            <Route path="/veterinario" element={<p>Panel veterinario</p>} />
          </Route>
          <Route path="/login" element={<p>Login</p>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  it('redirige a /mascotas si el usuario no es vet', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, loading: false, isVet: false })
    render(
      <MemoryRouter initialEntries={['/veterinario']}>
        <Routes>
          <Route element={<VetRoute />}>
            <Route path="/veterinario" element={<p>Panel veterinario</p>} />
          </Route>
          <Route path="/mascotas" element={<p>Mascotas</p>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Mascotas')).toBeInTheDocument()
  })

  it('muestra el contenido si el usuario es vet', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, loading: false, isVet: true })
    render(
      <MemoryRouter initialEntries={['/veterinario']}>
        <Routes>
          <Route element={<VetRoute />}>
            <Route path="/veterinario" element={<p>Panel veterinario</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Panel veterinario')).toBeInTheDocument()
  })
})

// ─── VetPetRecord ────────────────────────────────────────
describe('VetPetRecord — registrar datos médicos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Configurar el usuario veterinario autenticado
    useAuth.mockReturnValue({ user: { id: 'vet-123' }, loading: false, isVet: true })
  })

  function renderVetPetRecord() {
    return render(
      <MemoryRouter initialEntries={['/veterinario/mascotas/pet-123']}>
        <Routes>
          <Route path="/veterinario/mascotas/:petId" element={<VetPetRecord />} />
        </Routes>
      </MemoryRouter>
    )
  }

  function mockSupabase() {
    supabase.from.mockImplementation((table) => {
      if (table === 'pets') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'pet-123', name: 'Rex', animal_type: 'Perro', sex: 'Macho', breed: 'Labrador', chip_number: '123', photo_url: null },
              }),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })
  }

  it('muestra el formulario de nuevo registro', async () => {
    mockSupabase()
    renderVetPetRecord()
    await waitFor(() => screen.getByText('Rex'))
    fireEvent.click(screen.getAllByRole('button', { name: 'Consulta' })[0])
    expect(screen.getAllByRole('button', { name: 'Consulta' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Analisis' })).toBeInTheDocument()
    expect(screen.getByLabelText(/peso kg/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/altura cm/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/informe/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guardar registro/i })).toBeInTheDocument()
  })

  it('guarda el registro y limpia el formulario', async () => {
    mockSupabase()
    renderVetPetRecord()
    await waitFor(() => screen.getByText('Rex'))
    fireEvent.click(screen.getAllByRole('button', { name: 'Consulta' })[0])
    fireEvent.change(screen.getByLabelText(/informe/i), { target: { value: 'Revision de rutina' } })
    fireEvent.submit(document.querySelector('form'))
    await waitFor(() => {
      expect(screen.getByLabelText(/informe/i).value).toBe('')
    })
  })

  it('muestra error si falla al guardar', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'pets') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'pet-123', name: 'Rex', animal_type: 'Perro', sex: 'Macho', breed: null, chip_number: '123', photo_url: null },
              }),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ error: { message: 'Error al insertar' } }),
      }
    })
    renderVetPetRecord()
    await waitFor(() => screen.getByText('Rex'))
    fireEvent.click(screen.getAllByRole('button', { name: 'Consulta' })[0])
    fireEvent.submit(document.querySelector('form'))
    await waitFor(() => {
      expect(screen.getByText(/error al insertar/i)).toBeInTheDocument()
    })
  })
})
