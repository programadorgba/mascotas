import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Login from '../shared/components/Login'

vi.mock('../shared/lib/supabaseClient.js', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
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

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
}

describe('Login — lo que ve el usuario', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('muestra el formulario con email, contraseña y botón', () => {
    renderLogin()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByLabelText('Contrasena')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('muestra error con credenciales incorrectas', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' }
    })

    renderLogin()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'mal@correo.com' } })
    fireEvent.change(screen.getByLabelText('Contrasena'), { target: { value: 'wrongpassword' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(screen.getByText(/email o contrasena incorrectos/i)).toBeInTheDocument()
    })
  })

  it('redirige a /mascotas con credenciales correctas', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null })

    renderLogin()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'user@test.com' } })
    fireEvent.change(screen.getByLabelText('Contrasena'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/mascotas', { replace: true })
    })
  })

  it('guarda el email en localStorage si marca recordarme', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null })

    renderLogin()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'user@test.com' } })
    fireEvent.change(screen.getByLabelText('Contrasena'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByLabelText(/recordar mi email/i))
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(localStorage.getItem('petcare-remember-email')).toBe('user@test.com')
    })
  })

  it('muestra y oculta la contraseña', () => {
    renderLogin()
    const input = screen.getByLabelText('Contrasena')
    expect(input).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByLabelText(/ver contrasena/i))
    expect(input).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByLabelText(/ocultar contrasena/i))
    expect(input).toHaveAttribute('type', 'password')
  })

})