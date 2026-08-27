import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabaseClient'
import { downloadXLSX } from '../lib/reportes'
import { useToast } from '../context/ToastContext'
import {
  TIPO_LABEL,
  TIPO_ICON,
  ESTADO_LABEL,
  estadoBadgeClasses,
  isComplete,
  missingAccessories,
  componenteFaltante,
  tieneEquipo,
} from '../lib/assets'

const TABS = [
  { key: 'todos', label: 'Todos' },
  { key: 'tablets', label: 'Tablets PC' },
  { key: 'paneles', label: 'Paneles Solares' },
  { key: 'incompletos', label: 'Incompletos', alert: true },
]

const PAGE_SIZE = 20

// Aplica los filtros de pestaña + búsqueda a una consulta sobre la vista
// v_activos. Se usa tanto para la página visible como para el conteo y la
// exportación, así todos ven exactamente los mismos activos.
function applyFilters(query, { tab, search }) {
  if (tab === 'tablets') query = query.eq('tipo_bien', 'TABLET')
  else if (tab === 'paneles') query = query.eq('tipo_bien', 'PANEL_SOLAR')
  else if (tab === 'incompletos') query = query.eq('completo', false)
  if (search) {
    query = query.or(`codigo_barras.ilike.%${search}%,codigo_patrimonial.ilike.%${search}%`)
  }
  return query
}

// Mensaje de error más útil cuando aún no se ha aplicado la migración 0008.
function friendlyError(error) {
  if (error?.code === '42P01' || /v_activos|cajas_resumen/.test(error?.message ?? '')) {
    return 'Falta aplicar la migración 0008 en Supabase (vistas v_activos / cajas_resumen). Ejecuta supabase/migrations/0008_vistas_inventario_cajas.sql en el SQL Editor.'
  }
  return error?.message ?? 'Error desconocido.'
}

export default function Catalogo() {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('todos')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [metrics, setMetrics] = useState({ total: 0, tablets: 0, paneles: 0, incompletos: 0 })
  const [exporting, setExporting] = useState(false)
  const toast = useToast()

  // Debounce de la búsqueda para no consultar en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  // Al cambiar de pestaña o búsqueda, volvemos a la primera página.
  useEffect(() => {
    setPage(1)
  }, [tab, debouncedSearch])

  // Carga de la página visible (paginación en el servidor).
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const { data, error: qError, count } = await applyFilters(
        supabase.from('v_activos').select('*', { count: 'exact' }),
        { tab, search: debouncedSearch }
      )
        .order('created_at', { ascending: false })
        .range(from, to)

      if (cancelled) return
      if (qError) {
        setError(friendlyError(qError))
        setRows([])
        setTotal(0)
      } else {
        setRows(data ?? [])
        setTotal(count ?? 0)
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [page, tab, debouncedSearch])

  // Métricas globales (conteos baratos, sin traer filas). Se cargan una vez.
  useEffect(() => {
    let cancelled = false
    async function loadMetrics() {
      const head = () => supabase.from('v_activos').select('*', { count: 'exact', head: true })
      const [t, tb, pn, inc] = await Promise.all([
        head(),
        head().eq('tipo_bien', 'TABLET'),
        head().eq('tipo_bien', 'PANEL_SOLAR'),
        head().eq('completo', false),
      ])
      if (cancelled) return
      setMetrics({
        total: t.count ?? 0,
        tablets: tb.count ?? 0,
        paneles: pn.count ?? 0,
        incompletos: inc.count ?? 0,
      })
    }
    loadMetrics()
    return () => {
      cancelled = true
    }
  }, [])

  const incompletosCount = metrics.incompletos
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Exportación: descarga TODOS los activos que cumplen el filtro actual,
  // trayéndolos por lotes de 1000 (límite de PostgREST) bajo demanda.
  async function exportar() {
    setExporting(true)
    try {
      const CHUNK = 1000
      let all = []
      let from = 0
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error: qError } = await applyFilters(
          supabase.from('v_activos').select('*'),
          { tab, search: debouncedSearch }
        )
          .order('created_at', { ascending: false })
          .range(from, from + CHUNK - 1)
        if (qError) throw qError
        all = all.concat(data ?? [])
        if (!data || data.length < CHUNK) break
        from += CHUNK
      }
      if (all.length === 0) {
        toast.info('No hay activos para exportar con el filtro actual.')
        return
      }
      downloadXLSX(all, 'inventario.xlsx')
    } catch (e) {
      toast.error('No se pudo exportar: ' + friendlyError(e))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-md md:p-lg flex flex-col gap-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md">
        <div>
          <h2 className="font-display-lg text-display-lg text-primary tracking-tight">
            Catálogo General de Bienes
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Explora, filtra y gestiona tablets y paneles solares institucionales.
          </p>
        </div>
        <button
          onClick={exportar}
          disabled={exporting || total === 0}
          className="flex items-center gap-2 bg-surface-container-lowest border border-outline text-on-surface rounded-DEFAULT py-sm px-md font-label-md text-label-md hover:bg-surface-container-low transition-colors shadow-sm self-start disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name={exporting ? 'progress_activity' : 'download'} size={18} className={exporting ? 'animate-spin' : ''} />
          {exporting ? 'Exportando…' : 'Exportar Excel'}
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <MetricCard label="Total de activos" value={metrics.total} icon="devices" iconWrap="bg-primary-fixed" iconColor="text-primary" />
        <MetricCard label="Tablets" value={metrics.tablets} icon="tablet_mac" iconWrap="bg-secondary-fixed" iconColor="text-secondary" valueColor="text-secondary" />
        <MetricCard label="Paneles solares" value={metrics.paneles} icon="solar_power" iconWrap="bg-tertiary-fixed" iconColor="text-tertiary-container" valueColor="text-on-tertiary-container" />
        <MetricCard label="Incompletos" value={metrics.incompletos} icon="warning" iconWrap="bg-error-container" iconColor="text-error" valueColor="text-error" alert />
      </div>

      {/* Módulo de datos */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-outline-variant px-md pt-sm overflow-x-auto">
          {TABS.map((t) => {
            const active = tab === t.key
            const base = 'px-md py-sm font-label-md text-label-md whitespace-nowrap flex items-center gap-1 transition-colors'
            const color = active
              ? t.alert
                ? 'text-error border-b-2 border-error'
                : 'text-secondary border-b-2 border-secondary'
              : t.alert
                ? 'text-error/80 hover:text-error'
                : 'text-on-surface-variant hover:text-on-surface'
            return (
              <button key={t.key} className={`${base} ${color}`} onClick={() => setTab(t.key)}>
                {t.label}
                {t.alert && incompletosCount > 0 && (
                  <span className="bg-error text-on-error rounded-full px-1.5 py-0.5 text-[10px] leading-none ml-1">
                    {incompletosCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Toolbar búsqueda */}
        <div className="p-md border-b border-outline-variant flex flex-col lg:flex-row gap-md justify-between items-center">
          <div className="relative w-full lg:w-96">
            <Icon name="qr_code_scanner" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Código de barras o código patrimonial…"
              className="w-full pl-10 pr-4 py-sm bg-surface border border-outline-variant rounded-DEFAULT focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none font-body-sm text-body-sm text-on-surface transition-colors"
            />
          </div>
          <div className="font-body-sm text-body-sm text-on-surface-variant">
            {loading ? 'Cargando…' : `${total} resultado(s)`}
          </div>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-auto">
          {error ? (
            <EmptyState icon="cloud_off" title="Error al cargar" subtitle={error} error />
          ) : loading ? (
            <div className="p-xl flex justify-center items-center gap-md text-on-surface-variant">
              <Icon name="progress_activity" size={24} className="animate-spin text-secondary" />
              Cargando inventario…
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon="inventory_2"
              title="Sin activos"
              subtitle={
                metrics.total === 0
                  ? 'Aún no hay activos registrados. Usa Registro para dar de alta el primero.'
                  : 'Ningún activo coincide con el filtro actual.'
              }
            />
          ) : (
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 bg-surface-container-low border-b border-outline-variant z-10">
                <tr>
                  <Th>ID / Código de barras</Th>
                  <Th>Tipo y marca</Th>
                  <Th>Estado</Th>
                  <Th>Ubicación</Th>
                  <Th>Accesorios</Th>
                  <Th>Acciones</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {rows.map((a) => (
                  <AssetRow key={a.id} activo={a} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {!loading && !error && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-sm px-md py-sm border-t border-outline-variant">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-DEFAULT border border-outline font-label-md text-label-md text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icon name="chevron_left" size={18} />
                Anterior
              </button>
              <span className="font-body-sm text-body-sm text-on-surface-variant px-1">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-DEFAULT border border-outline font-label-md text-label-md text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente
                <Icon name="chevron_right" size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Th({ children }) {
  return (
    <th className="py-sm px-md font-label-md text-label-md text-on-surface-variant whitespace-nowrap">
      {children}
    </th>
  )
}

function AssetRow({ activo }) {
  const complete = isComplete(activo)
  const missing = missingAccessories(activo)

  return (
    <tr className="hover:bg-surface-container transition-colors group">
      {/* Código de barras */}
      <td className="py-md px-md">
        <div className="font-code-sm text-code-sm font-semibold text-primary">{activo.codigo_barras}</div>
        {activo.numero_caja != null && (
          <div className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-1">
            <Icon name="inventory_2" size={12} />
            Caja {activo.numero_caja}
          </div>
        )}
      </td>
      {/* Tipo y marca */}
      <td className="py-md px-md">
        <div className="flex items-center gap-2">
          <Icon
            name={TIPO_ICON[activo.tipo_bien]}
            size={18}
            className={activo.tipo_bien === 'TABLET' ? 'text-secondary' : 'text-tertiary-container'}
          />
          <div>
            <div className="font-body-sm text-body-sm font-semibold text-primary">
              {TIPO_LABEL[activo.tipo_bien]}
            </div>
            <div className="font-body-sm text-[12px] text-on-surface-variant">
              {[activo.marca, activo.modelo].filter(Boolean).join(' ') || '—'}
            </div>
          </div>
        </div>
      </td>
      {/* Estado */}
      <td className="py-md px-md">
        {tieneEquipo(activo) ? (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${estadoBadgeClasses(activo.estado_fisico)}`}>
            {ESTADO_LABEL[activo.estado_fisico] ?? activo.estado_fisico}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-error-container text-on-error-container border border-error/20">
            <Icon name="report" size={12} />
            Sin equipo
          </span>
        )}
        {componenteFaltante(activo) && tieneEquipo(activo) && (
          <div className="text-[11px] text-error mt-1 flex items-center gap-1">
            <Icon name="report" size={12} />
            {componenteFaltante(activo)}
          </div>
        )}
      </td>
      {/* Ubicación */}
      <td className="py-md px-md font-body-sm text-body-sm text-on-surface">
        {activo.ubicacion_actual}
        <div className="text-[11px] flex items-center gap-1 mt-0.5">
          {activo.verificado ? (
            <span className="text-secondary flex items-center gap-1">
              <Icon name="verified" size={12} />
              Verificado
            </span>
          ) : (
            <span className="text-outline flex items-center gap-1">
              <Icon name="pending" size={12} />
              Sin verificar
            </span>
          )}
        </div>
      </td>
      {/* Accesorios (badge verde/rojo) */}
      <td className="py-md px-md">
        {complete ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-secondary-fixed text-on-secondary-fixed">
            <Icon name="check_circle" size={12} />
            Completo
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-error-container text-on-error-container border border-error/20"
            title={`Falta: ${missing.join(', ')}`}
          >
            <Icon name="error" size={12} />
            {missing.length === 1 ? `Falta ${missing[0]}` : `Faltan ${missing.length}`}
          </span>
        )}
      </td>
      {/* Acciones */}
      <td className="py-md px-md">
        <Link
          to={`/registro/${activo.id}`}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-secondary hover:bg-secondary-fixed transition-colors"
          title="Editar activo"
        >
          <Icon name="edit" size={14} />
          Editar
        </Link>
      </td>
    </tr>
  )
}

function MetricCard({ label, value, icon, iconWrap, iconColor, valueColor = 'text-primary', alert }) {
  return (
    <div className={`bg-surface-container-lowest border border-outline-variant rounded-lg p-md shadow-sm flex items-center justify-between ${alert ? 'border-l-4 border-l-error' : ''}`}>
      <div>
        <p className={`font-body-sm text-body-sm ${alert ? 'text-error' : 'text-on-surface-variant'}`}>{label}</p>
        <p className={`font-title-md text-title-md font-bold mt-1 ${valueColor}`}>{value}</p>
      </div>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconWrap}`}>
        <Icon name={icon} className={iconColor} />
      </div>
    </div>
  )
}

function EmptyState({ icon, title, subtitle, error }) {
  return (
    <div className="p-xl flex flex-col items-center justify-center text-center gap-sm min-h-[300px]">
      <Icon name={icon} size={40} className={error ? 'text-error' : 'text-on-surface-variant'} />
      <p className="font-title-md text-title-md text-primary">{title}</p>
      <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">{subtitle}</p>
    </div>
  )
}
