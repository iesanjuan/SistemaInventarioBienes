import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn, session, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [site, setSite] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Si ya hay sesión, redirige fuera del login
  if (!authLoading && session) return <Navigate to={from} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: signInError } = await signIn(email.trim(), password)
    setSubmitting(false)
    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Credenciales inválidas. Verifica tu email y contraseña.'
          : signInError.message
      )
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center font-body-md p-md">
      <main className="w-full max-w-[440px]">
        {/* Marca */}
        <div className="text-center mb-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-container rounded-xl mb-md">
            <Icon name="inventory_2" filled className="text-[36px] text-on-primary-container" />
          </div>
          <h1 className="font-display-lg text-display-lg text-primary mb-xs">AssetTrack Pro</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Gestión de Inventario y Auditoría
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg md:p-xl shadow-sm">
          <form className="space-y-lg" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block font-label-md text-label-md text-on-surface mb-xs">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="person" size={20} className="text-outline" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@assettrack.pro"
                  className="block w-full pl-10 pr-3 py-2 border border-outline-variant rounded-DEFAULT bg-surface-container-low text-on-surface placeholder-on-surface-variant font-body-md text-body-md focus:ring-secondary focus:border-secondary transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block font-label-md text-label-md text-on-surface mb-xs">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="lock" size={20} className="text-outline" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2 border border-outline-variant rounded-DEFAULT bg-surface-container-low text-on-surface placeholder-on-surface-variant font-body-md text-body-md focus:ring-secondary focus:border-secondary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface-variant"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                </button>
              </div>
            </div>

            {/* Sede (cosmético / contexto) */}
            <div>
              <label htmlFor="site" className="block font-label-md text-label-md text-on-surface mb-xs">
                Almacén / Sede
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="warehouse" size={20} className="text-outline" />
                </div>
                <select
                  id="site"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2 border border-outline-variant rounded-DEFAULT bg-surface-container-low text-on-surface font-body-md text-body-md focus:ring-secondary focus:border-secondary appearance-none transition-colors"
                >
                  <option value="">Selecciona ubicación asignada</option>
                  <option value="central">Almacén General</option>
                  <option value="aip">AIP / Aulas</option>
                  <option value="field">Auditor de Campo (Móvil)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <Icon name="expand_more" size={20} className="text-outline" />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-xs bg-error-container text-on-error-container rounded-DEFAULT px-md py-sm font-body-sm text-body-sm">
                <Icon name="error" size={18} filled />
                <span>{error}</span>
              </div>
            )}

            {/* Acciones */}
            <div className="flex items-center justify-between pt-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-secondary focus:ring-secondary border-outline-variant rounded-sm"
                />
                <span className="font-body-sm text-body-sm text-on-surface-variant">Recordarme</span>
              </label>
              <a
                href="#"
                className="font-label-md text-label-md text-secondary hover:text-on-secondary-fixed-variant transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-DEFAULT shadow-sm font-label-md text-label-md text-on-primary bg-secondary hover:bg-on-secondary-fixed-variant focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting && <Icon name="progress_activity" size={18} className="animate-spin" />}
              {submitting ? 'Ingresando…' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <div className="mt-xl text-center">
          <p className="font-code-sm text-code-sm text-outline">v0.1.0 · Entorno seguro</p>
        </div>
      </main>
    </div>
  )
}
