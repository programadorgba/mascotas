import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Register from '../shared/components/Register'

vi.mock('../shared/lib/supabaseClient.js', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
    }
  }
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { supabase } from '../shared/lib/supabaseClient.js'

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  )
}

describe('Register — lo que ve el usuario', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra todos los campos del formulario', () => {
    renderRegister()
    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Contrasena')).toBeInTheDocument()
    expect(screen.getByLabelText('Repetir contrasena')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument()
  })

it('muestra error si el nombre está vacío', async () => {
  renderRegister()
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@test.com' } })
  fireEvent.change(screen.getByLabelText('Contrasena'), { target: { value: 'password123' } })
  fireEvent.change(screen.getByLabelText('Repetir contrasena'), { target: { value: 'password123' } })
  fireEvent.submit(document.querySelector('form'))

    await waitFor(() => {
      expect(screen.getByText(/escribe tu nombre completo/i)).toBeInTheDocument()
    })
  })

  it('muestra error si las contraseñas no coinciden', async () => {
    renderRegister()
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Maria Lopez' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@test.com' } })
    fireEvent.change(screen.getByLabelText('Contrasena'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Repetir contrasena'), { target: { value: 'otrapassword' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    await waitFor(() => {
      expect(screen.getByText(/las contrasenas no coinciden/i)).toBeInTheDocument()
    })
  })

  it('muestra error si el email ya está registrado', async () => {
    supabase.auth.signUp.mockResolvedValue({
      error: { code: 'user_already_exists', message: 'User already registered' }
    })

    renderRegister()
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Maria Lopez' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'existente@test.com' } })
    fireEvent.change(screen.getByLabelText('Contrasena'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Repetir contrasena'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    await waitFor(() => {
      expect(screen.getByText(/este email ya esta registrado/i)).toBeInTheDocument()
    })
  })

  it('redirige a /mascotas con datos correctos', async () => {
    supabase.auth.signUp.mockResolvedValue({ error: null })

    renderRegister()
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Maria Lopez' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nuevo@test.com' } })
    fireEvent.change(screen.getByLabelText('Contrasena'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Repetir contrasena'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/mascotas', { replace: true })
    })
  })

})