import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, HeartPulse } from 'lucide-react'
import { supabase } from '../lib/supabaseClient.js'

const REMEMBER_EMAIL_KEY = 'petcare-remember-email'

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

    try {
      const { error: authError } = await supabase.auth.signInWithPassword(form)

      if (authError) {
        setError('Email o contrasena incorrectos.')
        return
      }

      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, form.email)
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
