import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="h-screen flex overflow-hidden bg-surface text-on-surface">
      {/* Sidebar fijo solo en pantallas grandes (escritorio) */}
      <div className="hidden 2xl:block flex-shrink-0">
        <Sidebar />
      </div>

      {/* Drawer (móvil y tablets, incl. 10.1") */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 2xl:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 h-full shadow-xl">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Columna principal */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Topbar onOpenMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-surface">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
