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
          <span className="google-mark">G</span>
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
