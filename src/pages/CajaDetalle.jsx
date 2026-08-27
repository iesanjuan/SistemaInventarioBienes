import { useEffect, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabaseClient'
import {
  TIPO_LABEL,
  TIPO_ICON,
  TIPO_CAJA_LABEL,
  SLUG_TIPO,
  ESTADO_LABEL,
  estadoBadgeClasses,
  isComplete,
  missingAccessories,
  componenteFaltante,
  tieneEquipo,
} from '../lib/assets'

function friendlyError(error) {
  if (error?.code === '42P01' || /v_activos|cajas_resumen/.test(error?.message ?? '')) {
    return 'Falta aplicar la migración 0008 en Supabase (vista v_activos). Ejecuta supabase/migrations/0008_vistas_inventario_cajas.sql en el SQL Editor.'
  }
  return error?.message ?? 'Error desconocido.'
}

export default function CajaDetalle() {
  const { tipo, numero } = useParams()
  const tipoBien = SLUG_TIPO[tipo]
  const tipoLabel = TIPO_CAJA_LABEL[tipoBien] ?? ''
  const esSinCaja = numero === 'sin-caja'
  const titulo = esSinCaja
    ? `Sin caja · ${tipoLabel}`
    : `CAJA ${numero} ${tipoLabel}`

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      // Slug de tipo desconocido (URL manipulada): no hay nada que mostrar.
      if (!tipoBien) {
        setRows([])
        setLoading(false)
        return
      }
      let query = supabase.from('v_activos').select('*').eq('tipo_bien', tipoBien)
      query = esSinCaja
        ? query.is('numero_caja', null)
        : query.eq('numero_caja', Number(numero))
      const { data, error: qError } = await query.order('created_at', { ascending: false })

      if (cancelled) return
      if (qError) {
        setError(friendlyError(qError))
        setRows([])
      } else {
        setRows(data ?? [])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [numero, esSinCaja, tipoBien])

  return (
    <div className="p-md md:p-lg flex flex-col gap-lg">
      {/* Header */}
      <div className="flex flex-col gap-sm">
        <Link
          to="/cajas"
          className="inline-flex items-center gap-1 font-label-md text-label-md text-secondary hover:underline w-fit"
        >
          <Icon name="arrow_back" size={18} />
          Volver a cajas
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center">
            <Icon name="inventory_2" size={24} />
          </div>
          <div>
            <h2 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-primary tracking-tight">
              {titulo}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {loading ? 'Cargando…' : `${rows.length} activo(s) en esta caja.`}
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-xl flex flex-col items-center justify-center text-center gap-sm min-h-[240px]">
          <Icon name="cloud_off" size={40} className="text-error" />
          <p className="font-title-md text-title-md text-primary">Error al cargar</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">{error}</p>
        </div>
      ) : loading ? (
        <div className="p-xl flex justify-center items-center gap-md text-on-surface-variant">
          <Icon name="progress_activity" size={24} className="animate-spin text-secondary" />
          Cargando activos…
        </div>
      ) : rows.length === 0 ? (
        <div className="p-xl flex flex-col items-center justify-center text-center gap-sm min-h-[240px]">
          <Icon name="inventory_2" size={40} className="text-on-surface-variant" />
          <p className="font-title-md text-title-md text-primary">Sin activos</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
            No hay activos registrados en esta caja.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {rows.map((a) => (
            <ActivoCard key={a.id} activo={a} />
          ))}
        </div>
      )}
    </div>
  )
}

function ActivoCard({ activo }) {
  const location = useLocation()
  const complete = isComplete(activo)
  const missing = missingAccessories(activo)

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm p-md flex flex-col gap-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-code-sm text-code-sm font-semibold text-primary truncate">
            {activo.codigo_barras}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Icon
              name={TIPO_ICON[activo.tipo_bien]}
              size={16}
              className={activo.tipo_bien === 'TABLET' ? 'text-secondary' : 'text-tertiary-container'}
            />
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {[TIPO_LABEL[activo.tipo_bien], activo.marca, activo.modelo].filter(Boolean).join(' · ')}
            </span>
          </div>
        </div>
        <Link
          to={`/registro/${activo.id}`}
          state={{ from: location.pathname }}
          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-secondary hover:bg-secondary-fixed transition-colors"
          title="Editar activo"
        >
          <Icon name="edit" size={14} />
          Editar
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {/* Estado físico */}
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
        {/* Accesorios */}
        {complete ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-secondary-fixed text-on-secondary-fixed">
            <Icon name="check_circle" size={12} />
            Completo
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-error-container text-on-error-container border border-error/20"
            title={`Falta: ${missing.join(', ')}`}
          >
            <Icon name="error" size={12} />
            {missing.length === 1 ? `Falta ${missing[0]}` : `Faltan ${missing.length}`}
          </span>
        )}
        {componenteFaltante(activo) && tieneEquipo(activo) && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-error">
            <Icon name="report" size={12} />
            {componenteFaltante(activo)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 text-[12px] text-on-surface-variant mt-auto pt-1 border-t border-outline-variant">
        <Icon name="location_on" size={14} />
        {activo.ubicacion_actual}
      </div>
    </div>
  )
}
