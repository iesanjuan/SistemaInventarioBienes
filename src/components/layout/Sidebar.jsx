import { NavLink } from 'react-router-dom'
import Icon from '../Icon'
import { NAV_ITEMS, NAV_FOOTER_ITEMS } from '../../config/nav'

const baseLink =
  'flex items-center gap-md px-md py-sm rounded-DEFAULT font-body-md text-body-md transition-colors'
const activeLink = 'bg-secondary-container text-on-secondary-container font-semibold'
const inactiveLink = 'text-on-surface-variant hover:bg-surface-container-high'
const disabledLink = 'text-on-surface-variant/50 cursor-not-allowed'

function NavItem({ item }) {
  if (!item.path) {
    return (
      <span className={`${baseLink} ${disabledLink}`} title="Próximamente" aria-disabled="true">
        <Icon name={item.icon} size={20} />
        {item.label}
      </span>
    )
  }
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => `${baseLink} ${isActive ? activeLink : inactiveLink}`}
    >
      {({ isActive }) => (
        <>
          <Icon name={item.icon} size={20} filled={isActive} />
          {item.label}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ onClose }) {
  return (
    <aside className="h-full w-sidebar-width bg-surface border-r border-outline-variant flex flex-col">
      {/* Header / Marca */}
      <div className="p-lg flex items-center gap-md border-b border-outline-variant">
        <div className="w-10 h-10 rounded bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-title-md">
          AT
        </div>
        <div className="flex-1">
          <h1 className="font-title-md text-title-md font-bold text-primary">AssetTrack</h1>
          <p className="font-label-md text-label-md text-on-surface-variant">Inventario y Auditoría</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 text-on-surface-variant hover:bg-surface-container-high rounded-DEFAULT"
            aria-label="Cerrar menú"
          >
            <Icon name="close" size={22} />
          </button>
        )}
      </div>

      {/* CTA */}
      <div className="p-md">
        <NavLink
          to="/auditoria"
          className="w-full bg-secondary text-on-secondary hover:opacity-90 py-sm rounded-DEFAULT font-label-md text-label-md transition-opacity flex justify-center items-center gap-xs"
        >
          <Icon name="add" size={18} />
          Nueva Auditoría
        </NavLink>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 overflow-y-auto py-sm px-sm">
        <ul className="space-y-xs">
          {NAV_ITEMS.map((item) => (
            <li key={item.label}>
              <NavItem item={item} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-sm border-t border-outline-variant">
        <ul className="space-y-xs">
          {NAV_FOOTER_ITEMS.map((item) => (
            <li key={item.label}>
              <NavItem item={item} />
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
