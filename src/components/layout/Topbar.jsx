import { useState } from 'react'
import Icon from '../Icon'
import { useAuth } from '../../context/AuthContext'

export default function Topbar({ onOpenMenu }) {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const initials = (user?.email ?? '?').slice(0, 2).toUpperCase()

  return (
    <header className="flex justify-between items-center px-lg w-full h-16 bg-surface-container-lowest border-b border-outline-variant shadow-sm flex-shrink-0">
      {/* Izquierda: menú móvil + búsqueda */}
      <div className="flex items-center gap-md flex-1 max-w-md">
        <button
          onClick={onOpenMenu}
          className="md:hidden p-xs text-on-surface-variant hover:bg-surface-container-high rounded-DEFAULT"
          aria-label="Abrir menú"
        >
          <Icon name="menu" />
        </button>
        <div className="relative w-full hidden sm:block">
          <Icon
            name="search"
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="text"
            placeholder="Buscar en AssetTrack Pro…"
            className="w-full pl-10 pr-4 py-sm bg-surface-container-low border border-transparent rounded-DEFAULT focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none font-body-sm text-body-sm text-on-surface placeholder-on-surface-variant transition-colors"
          />
        </div>
      </div>

      {/* Derecha: acciones + perfil */}
      <div className="flex items-center gap-md">
        <button className="hidden lg:flex items-center gap-2 bg-secondary text-on-secondary rounded-DEFAULT py-xs px-md font-label-md text-label-md hover:opacity-90 transition-opacity">
          <Icon name="sync" size={18} />
          Sincronizar
        </button>
        {/* Perfil + menú */}
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
