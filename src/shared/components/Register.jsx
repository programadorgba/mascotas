import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabaseClient.js'

function getRegisterErrorMessage(authError) {
  const message = authError?.message || ''
  const code = authError?.code || ''
  const text = `${code} ${message}`.toLowerCase()

  if (text.includes('user_already_exists') || text.includes('already registered') || text.includes('already exists')) {
    return 'Este email ya esta registrado. Entra desde login o usa otro email.'
  }

  if (text.includes('weak_password') || text.includes('password')) {
    return 'La contrasena no cumple los requisitos de Supabase. Usa al menos 8 caracteres con una mezcla de letras y numeros.'
  }

  if (text.includes('invalid_email') || text.includes('email')) {
    return 'El email no es valido. Revisa que este escrito correctamente.'
  }

  if (text.includes('signup') && text.includes('disabled')) {
    return 'El registro esta deshabilitado en Supabase Auth. Activalo en Authentication > Providers > Email.'
  }

  return message || 'No se pudo crear la cuenta. Revisa los datos e intentalo de nuevo.'
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const email = form.email.trim().toLowerCase()
    const fullName = form.full_name.trim()

    if (!fullName) {
      setError('Escribe tu nombre completo.')
      setLoading(false)
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Las contrasenas no coinciden.')
      setLoading(false)
      return
    }

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: {
            full_name: fullName,
            role: 'owner',
          },
        },
      })

      if (authError) {
        console.warn('Supabase signup error:', authError)
        setError(getRegisterErrorMessage(authError))
        return
      }

      navigate('/mascotas', { replace: true })
    } catch {
      setError('No se pudo conectar con Supabase. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError('')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/mascotas`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (oauthError) setError(oauthError.message)
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <div className="auth-logo"><img src="/android-chrome-192x192.png" alt="PetCare" width="48" height="48" /></div>
          <strong>PetCare</strong>
        </div>
        <h1>Registro</h1>
        <p>Crea tu cuenta para guardar las fichas de tus mascotas.</p>

        <button className="google-button" type="button" onClick={handleGoogleLogin}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Registrarse con Google
        </button>

        <div className="auth-divider"><span>o con email</span></div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Nombre completo
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </label>
          <label>
            Email
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            Contrasena
            <span className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar contrasena' : 'Ver contrasena'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          <label>
            Repetir contrasena
            <span className="password-field">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
              <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? 'Ocultar contrasena' : 'Ver contrasena'}>
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" disabled={loading}>{loading ? 'Creando...' : 'Crear cuenta'}</button>
        </form>

        <p className="auth-link">Ya tienes cuenta? <Link to="/login">Entrar</Link></p>
      </section>
    </main>
  )
}
