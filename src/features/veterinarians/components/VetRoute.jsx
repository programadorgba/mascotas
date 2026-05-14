import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../../shared/context/AuthContext.jsx'
import { LoadingScreen } from '../../../shared/components/LoadingScreen.jsx'

export function VetRoute() {
  const { user, loading, isVet } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isVet) return <Navigate to="/mascotas" replace />

  return <Outlet />
}
