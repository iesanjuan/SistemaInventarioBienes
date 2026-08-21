import { useState } from 'react'
import Icon from '../Icon'
import { useAuth } from '../../context/AuthContext'

export default function Topbar({ onOpenMenu }) {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const initials = (user?.email ?? '?').slice(0, 2).toUpperCase()

  return (
    <header className="flex justify-between items-center px-lg w-full h-16 bg-surface-container-lowest border-b border-outline-variant shadow-sm flex-shrink-0">
      {/* Izquierda: menú móvil */}
      <div className="flex items-center gap-md">
        <button
          onClick={onOpenMenu}
          className="2xl:hidden p-xs text-on-surface-variant hover:bg-surface-container-high rounded-DEFAULT"
          aria-label="Abrir menú"
        >
          <Icon name="menu" />
        </button>
      </div>

      {/* Derecha: perfil */}
      <div className="flex items-center gap-md">
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed border border-outline-variant flex items-center justify-center font-label-md text-label-md font-bold"
            aria-label="Menú de usuario"
          >
            {initials}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="px-md py-sm border-b border-outline-variant">
                  <p className="font-label-md text-label-md text-on-surface-variant">Sesión iniciada</p>
                  <p className="font-body-sm text-body-sm text-primary truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    signOut()
                  }}
                  className="w-full flex items-center gap-md px-md py-sm text-body-sm font-body-sm text-error hover:bg-error-container/30 transition-colors"
                >
                  <Icon name="logout" size={18} />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
