import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Catalogo from './pages/Catalogo'
import Registro from './pages/Registro'
import Configuracion from './pages/Configuracion'

// Carga diferida: Auditoría arrastra html5-qrcode (pesado) y Conciliación solo se
// usa bajo demanda. Así no penalizan la carga inicial del catálogo/login.
const Auditoria = lazy(() => import('./pages/Auditoria'))
const Conciliacion = lazy(() => import('./pages/Conciliacion'))
const Asignacion = lazy(() => import('./pages/Asignacion'))
const Reportes = lazy(() => import('./pages/Reportes'))

function PageFallback() {
  return (
    <div className="p-xl flex items-center justify-center gap-md text-on-surface-variant">
      <span className="material-symbols-outlined animate-spin text-[28px] text-secondary">progress_activity</span>
      Cargando…
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Pública */}
      <Route path="/login" element={<Login />} />

      {/* Protegidas (con layout de app) */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route
          path="/auditoria"
          element={
            <Suspense fallback={<PageFallback />}>
              <Auditoria />
            </Suspense>
          }
        />
        <Route
          path="/conciliacion"
          element={
            <Suspense fallback={<PageFallback />}>
              <Conciliacion />
            </Suspense>
          }
        />
        <Route
          path="/conciliacion/:id"
          element={
            <Suspense fallback={<PageFallback />}>
              <Conciliacion />
            </Suspense>
          }
        />
        <Route
          path="/asignaciones"
          element={
            <Suspense fallback={<PageFallback />}>
              <Asignacion />
            </Suspense>
          }
        />
        <Route
          path="/reportes"
          element={
            <Suspense fallback={<PageFallback />}>
              <Reportes />
            </Suspense>
          }
        />
      </Route>

      {/* Home + fallback */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
