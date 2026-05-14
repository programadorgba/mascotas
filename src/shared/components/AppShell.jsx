import { Link, Outlet, useNavigate } from 'react-router-dom'
import { HeartPulse, LogOut, Moon, PawPrint, Search, Sun, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

export function AppShell({ area }) {
  const navigate = useNavigate()
  const { profile, vetProfile, signOut, deleteAccount } = useAuth()
  const isVet = area === 'vet'
  const [isDark, setIsDark] = useState(() => localStorage.getItem('petcare-theme') === 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
    localStorage.setItem('petcare-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm('Esto borrara tu cuenta, tus mascotas y sus datos medicos. Esta accion no se puede deshacer.')
    if (!confirmed) return

    try {
      await deleteAccount()
      navigate('/login', { replace: true })
    } catch (error) {
      window.alert(error.message || 'No se pudo borrar la cuenta.')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to={isVet ? '/veterinario' : '/mascotas'}>
          <span className="brand-mark"><HeartPulse size={22} /></span>
          <span>
            <strong>PetCare</strong>
            <small>{isVet ? 'Portal clinico' : 'Salud de mascotas'}</small>
          </span>
        </Link>

        <nav className="nav-list">
          {isVet ? (
            <Link to="/veterinario"><Search size={18} /> Buscar chip</Link>
          ) : (
            <Link to="/mascotas"><PawPrint size={18} /> Mis mascotas</Link>
          )}
        </nav>

        <div className="account-strip">
          <div>
            <strong>{vetProfile?.clinic_name || profile?.full_name || 'Cuenta PetCare'}</strong>
            <small>{isVet ? 'Veterinario autorizado' : 'Propietario'}</small>
          </div>
          <button className="icon-button" type="button" onClick={() => setIsDark((value) => !value)} aria-label="Cambiar tema">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {!isVet && (
            <button className="icon-button danger-icon" type="button" onClick={handleDeleteAccount} aria-label="Borrar mi cuenta">
              <Trash2 size={18} />
            </button>
          )}
          <button className="icon-button" type="button" onClick={handleSignOut} aria-label="Cerrar sesion">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <section className="workspace">
        <Outlet />
      </section>
    </div>
  )
}
