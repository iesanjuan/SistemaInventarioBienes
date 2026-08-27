import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabaseClient'

// Mensaje de error más útil cuando aún no se ha aplicado la migración 0008.
function friendlyError(error) {
  if (error?.code === '42P01' || /v_activos|cajas_resumen/.test(error?.message ?? '')) {
    return 'Falta aplicar la migración 0008 en Supabase (vista cajas_resumen). Ejecuta supabase/migrations/0008_vistas_inventario_cajas.sql en el SQL Editor.'
  }
  return error?.message ?? 'Error desconocido.'
}

// Segmento de URL para el detalle (las cajas sin número usan "sin-caja").
export function cajaSlug(numero) {
  return numero == null ? 'sin-caja' : String(numero)
}

export default function Cajas() {
  const [cajas, setCajas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      const { data, error: qError } = await supabase
        .from('cajas_resumen')
        .select('*')
      if (cancelled) return
      if (qError) {
        setError(friendlyError(qError))
        setCajas([])
      } else {
        setCajas(data ?? [])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const totalActivos = cajas.reduce((s, c) => s + (c.total_activos ?? 0), 0)

  return (
    <div className="p-md md:p-lg flex flex-col gap-lg">
      {/* Header */}
      <div>
        <h2 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-primary tracking-tight">
          Inventario por Cajas
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          {loading
            ? 'Cargando cajas…'
            : `${cajas.length} caja(s) · ${totalActivos} activo(s) en total.`}
        </p>
      </div>

      {error ? (
        <div className="p-xl flex flex-col items-center justify-center text-center gap-sm min-h-[300px]">
          <Icon name="cloud_off" size={40} className="text-error" />
          <p className="font-title-md text-title-md text-primary">Error al cargar</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">{error}</p>
        </div>
      ) : loading ? (
        <div className="p-xl flex justify-center items-center gap-md text-on-surface-variant">
          <Icon name="progress_activity" size={24} className="animate-spin text-secondary" />
          Cargando cajas…
        </div>
      ) : cajas.length === 0 ? (
        <div className="p-xl flex flex-col items-center justify-center text-center gap-sm min-h-[300px]">
          <Icon name="shelves" size={40} className="text-on-surface-variant" />
          <p className="font-title-md text-title-md text-primary">Sin cajas</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
            Aún no hay activos con número de caja registrado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
          {cajas.map((c) => (
            <CajaCard key={cajaSlug(c.numero_caja)} caja={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function CajaCard({ caja }) {
  const esSinCaja = caja.numero_caja == null
  const titulo = esSinCaja ? 'Sin caja' : `CAJA ${caja.numero_caja}`
  const incompletos = caja.incompletos ?? 0

  return (
    <Link
      to={`/cajas/${cajaSlug(caja.numero_caja)}`}
      className="group bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm p-md flex flex-col gap-md hover:border-secondary hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center">
            <Icon name="inventory_2" size={20} />
          </div>
          <h3 className="font-title-md text-title-md text-primary">{titulo}</h3>
        </div>
        {incompletos > 0 && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-error-container text-on-error-container border border-error/20"
            title={`${incompletos} activo(s) incompleto(s)`}
          >
            <Icon name="warning" size={12} filled />
            {incompletos}
          </span>
        )}
      </div>

      <div>
        <p className="font-display-lg text-display-lg text-secondary leading-none">
          {caja.total_activos ?? 0}
        </p>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          {caja.total_activos === 1 ? 'activo' : 'activos'} en esta caja
        </p>
      </div>

      <span className="mt-auto inline-flex items-center gap-1 font-label-md text-label-md text-secondary group-hover:underline">
        Ver detalles
        <Icon name="arrow_forward" size={16} />
      </span>
    </Link>
  )
}
