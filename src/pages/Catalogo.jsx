import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabaseClient'
import { downloadXLSX } from '../lib/reportes'
import {
  TIPO_LABEL,
  TIPO_ICON,
  ESTADO_LABEL,
  estadoBadgeClasses,
  isComplete,
  missingAccessories,
} from '../lib/assets'

const TABS = [
  { key: 'todos', label: 'Todos' },
  { key: 'tablets', label: 'Tablets PC' },
  { key: 'paneles', label: 'Paneles Solares' },
  { key: 'incompletos', label: 'Incompletos', alert: true },
]

export default function Catalogo() {
  const [activos, setActivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('todos')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      const { data, error: qError } = await supabase
        .from('activos')
        .select('*, accesorios_activos(*)')
        .order('created_at', { ascending: false })

      if (cancelled) return
      if (qError) {
        setError(qError.message)
        setActivos([])
      } else {
        setActivos(data ?? [])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const incompletosCount = useMemo(
    () => activos.filter((a) => !isComplete(a)).length,
    [activos]
  )

  const metrics = useMemo(() => {
    const total = activos.length
    const tablets = activos.filter((a) => a.tipo_bien === 'TABLET').length
    const paneles = activos.filter((a) => a.tipo_bien === 'PANEL_SOLAR').length
    return { total, tablets, paneles, incompletos: incompletosCount }
  }, [activos, incompletosCount])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return activos.filter((a) => {
      // Filtro por pestaña
      if (tab === 'tablets' && a.tipo_bien !== 'TABLET') return false
      if (tab === 'paneles' && a.tipo_bien !== 'PANEL_SOLAR') return false
      if (tab === 'incompletos' && isComplete(a)) return false
      // Filtro por búsqueda (código de barras o patrimonial)
      if (term) {
        const cb = (a.codigo_barras ?? '').toLowerCase()
        const cp = (a.codigo_patrimonial ?? '').toLowerCase()
        if (!cb.includes(term) && !cp.includes(term)) return false
      }
      return true
    })
  }, [activos, tab, search])

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
          onClick={() => downloadXLSX(filtered, 'inventario.xlsx')}
          disabled={loading || filtered.length === 0}
          className="flex items-center gap-2 bg-surface-container-lowest border border-outline text-on-surface rounded-DEFAULT py-sm px-md font-label-md text-label-md hover:bg-surface-container-low transition-colors shadow-sm self-start disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name="download" size={18} />
          Exportar Excel
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
            {loading ? 'Cargando…' : `${filtered.length} resultado(s)`}
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
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="inventory_2"
              title="Sin activos"
              subtitle={
                activos.length === 0
                  ? 'Aún no hay activos registrados. Usa Registration para dar de alta el primero.'
                  : 'Ningún activo coincide con el filtro actual.'
              }
            />
          ) : (
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 bg-surface-container-low border-b border-outline-variant z-10">
                <tr>
                  <Th>ID / Código de barras</Th>
                  <Th>Cód. patrimonial</Th>
                  <Th>Tipo y marca</Th>
                  <Th>Estado</Th>
                  <Th>Ubicación</Th>
                  <Th>Accesorios</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered.map((a) => (
                  <AssetRow key={a.id} activo={a} />
                ))}
              </tbody>
            </table>
          )}
        </div>
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
      </td>
      {/* Patrimonial */}
      <td className="py-md px-md font-code-sm text-code-sm text-on-surface">
        {activo.codigo_patrimonial || <span className="text-outline">—</span>}
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
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${estadoBadgeClasses(activo.estado_fisico)}`}>
          {ESTADO_LABEL[activo.estado_fisico] ?? activo.estado_fisico}
        </span>
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
              Pendiente
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
