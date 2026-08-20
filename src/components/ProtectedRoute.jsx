import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-md text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin text-[32px] text-secondary">progress_activity</span>
        <p className="font-body-sm text-body-sm">Cargando sesión…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
