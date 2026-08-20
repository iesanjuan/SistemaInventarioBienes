import { useState } from 'react'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function Configuracion() {
  const { user, signOut } = useAuth()
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function cambiarPassword(e) {
    e.preventDefault()
    setMsg('')
    setError('')
    if (pwd.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (pwd !== pwd2) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setSaving(true)
    const { error: upErr } = await supabase.auth.updateUser({ password: pwd })
    setSaving(false)
    if (upErr) {
      setError(upErr.message)
      return
    }
    setMsg('Contraseña actualizada correctamente.')
    setPwd('')
    setPwd2('')
  }

  const creado = user?.created_at ? new Date(user.created_at).toLocaleString('es') : '—'
  const ultimo = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('es') : '—'

  return (
    <div className="p-md md:p-lg max-w-2xl mx-auto flex flex-col gap-lg">
      <div>
        <h2 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-primary">Configuración</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Gestiona tu cuenta y preferencias de acceso.
        </p>
      </div>

      {/* Perfil */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm">
        <div className="px-md py-3 border-b border-outline-variant">
          <h3 className="font-title-md text-title-md text-primary">Cuenta</h3>
        </div>
        <div className="p-md flex items-center gap-md">
          <div className="w-14 h-14 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-title-md">
            {(user?.email ?? '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-body-md text-body-md text-primary font-semibold truncate">{user?.email}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Cuenta creada: {creado}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Último acceso: {ultimo}</p>
          </div>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <form onSubmit={cambiarPassword} className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm">
        <div className="px-md py-3 border-b border-outline-variant">
          <h3 className="font-title-md text-title-md text-primary">Cambiar contraseña</h3>
        </div>
        <div className="p-md grid grid-cols-1 sm:grid-cols-2 gap-md">
          <Field label="Nueva contraseña">
            <input type="password" className={inputCls} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </Field>
          <Field label="Confirmar contraseña">
            <input type="password" className={inputCls} value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </Field>

          {error && (
            <div className="sm:col-span-2 flex items-start gap-xs bg-error-container text-on-error-container rounded-DEFAULT px-md py-sm font-body-sm text-body-sm">
              <Icon name="error" size={18} filled />
              <span>{error}</span>
            </div>
          )}
          {msg && (
            <div className="sm:col-span-2 flex items-start gap-xs bg-secondary-fixed text-on-secondary-fixed rounded-DEFAULT px-md py-sm font-body-sm text-body-sm">
              <Icon name="check_circle" size={18} filled />
              <span>{msg}</span>
            </div>
          )}

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-secondary text-on-secondary font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-60"
            >
              {saving && <Icon name="progress_activity" size={18} className="animate-spin" />}
              {saving ? 'Guardando…' : 'Actualizar contraseña'}
            </button>
          </div>
        </div>
      </form>

      {/* Sesión */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm p-md flex items-center justify-between">
        <div>
          <p className="font-body-md text-body-md text-primary font-semibold">Cerrar sesión</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Finaliza tu sesión en este dispositivo.</p>
        </div>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 rounded-DEFAULT border border-error text-error font-label-md text-label-md hover:bg-error-container/30 transition-colors flex items-center gap-2"
        >
          <Icon name="logout" size={18} />
          Salir
        </button>
      </div>
    </div>
  )
}

const inputCls =
  'w-full border border-outline-variant rounded-lg py-2 px-3 bg-surface-container-lowest focus:ring-2 focus:ring-secondary focus:border-secondary text-body-md text-on-surface outline-none transition-colors'

function Field({ label, children }) {
  return (
    <div>
      <label className="block font-label-md text-label-md text-on-surface mb-1">{label}</label>
      {children}
    </div>
  )
}
