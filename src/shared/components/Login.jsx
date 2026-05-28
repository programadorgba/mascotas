import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, HeartPulse } from 'lucide-react'
import { supabase } from '../lib/supabaseClient.js'

const REMEMBER_EMAIL_KEY = 'petcare-remember-email'

function getLoginErrorMessage(authError) {
  const message = authError?.message || ''
  const code = authError?.code || ''
  const text = `${code} ${message}`.toLowerCase()

  if (text.includes('email_not_confirmed') || text.includes('email not confirmed')) {
    return 'Debes confirmar el email antes de entrar. Revisa tu correo o desactiva la confirmacion en Supabase Auth.'
  }

  if (text.includes('email logins are disabled')) {
    return 'El login por email esta desactivado en Supabase. Activa Email en Authentication > Providers.'
  }

  if (text.includes('invalid_credentials') || text.includes('invalid login credentials')) {
    return 'Email o contrasena incorrectos. Usa el mismo email con el que se creo la cuenta.'
  }

  return message || 'No se pudo iniciar sesion. Revisa los datos e intentalo de nuevo.'
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY) || ''
  const [form, setForm] = useState({ email: rememberedEmail, password: '' })
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedEmail))
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const email = form.email.trim().toLowerCase()

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: form.password,
      })

      if (authError) {
        console.warn('Supabase login error:', authError)
        setError(getLoginErrorMessage(authError))
        return
      }

      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email)
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY)
      }

      navigate(location.state?.from?.pathname || '/mascotas', { replace: true })
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
      },
    })

    if (oauthError) setError(oauthError.message)
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <div className="auth-logo"><HeartPulse size={30} /></div>
          <strong>PetCare</strong>
        </div>
        <h1>PetCare</h1>
        <p>Acceso seguro para propietarios y veterinarios.</p>

        <button className="google-button" type="button" onClick={handleGoogleLogin}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Entrar con Google
        </button>

        <div className="auth-divider"><span>o con email</span></div>

        <form className="form-stack" onSubmit={handleSubmit}>
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
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Recordar mi email en este dispositivo
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
        </form>

        <p className="auth-link">No tienes cuenta? <Link to="/registro">Crear registro</Link></p>
      </section>
    </main>
  )
}
