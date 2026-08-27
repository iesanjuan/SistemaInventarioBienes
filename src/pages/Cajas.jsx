import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabaseClient'
import { TIPO_LABEL, TIPO_ICON, TIPO_CAJA_LABEL, TIPO_SLUG } from '../lib/assets'

// Mensaje de error más útil cuando aún no se ha aplicado la migración 0008/0009.
function friendlyError(error) {
  if (error?.code === '42P01' || /v_activos|cajas_resumen/.test(error?.message ?? '')) {
    return 'Falta aplicar las migraciones en Supabase (vista cajas_resumen). Ejecuta supabase/migrations/0008 y 0009 en el SQL Editor.'
  }
  return error?.message ?? 'Error desconocido.'
}

// Segmento de URL para el detalle (las cajas sin número usan "sin-caja").
export function cajaSlug(numero) {
  return numero == null ? 'sin-caja' : String(numero)
}

// Orden de las secciones por tipo de bien.
const TIPOS_ORDEN = ['TABLET', 'PANEL_SOLAR']

export default function Cajas() {
  const [cajas, setCajas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Tipo seleccionado en el selector superior (Tablet / Panel).
  const [tipoSel, setTipoSel] = useState('TABLET')

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

  // Conteos por tipo (para el selector) y cajas del tipo seleccionado.
  const conteoPorTipo = useMemo(() => {
    const acc = { TABLET: 0, PANEL_SOLAR: 0 }
    cajas.forEach((c) => {
      if (c.tipo_bien in acc) acc[c.tipo_bien] += 1
    })
    return acc
  }, [cajas])

  const cajasDelTipo = cajas.filter((c) => c.tipo_bien === tipoSel)

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
        <div className="flex flex-col gap-md">
          {/* Selector de tipo: cambia entre Tablet y Panel sin scroll. */}
          <div className="flex gap-2">
            {TIPOS_ORDEN.map((tipo) => (
              <TipoTab
                key={tipo}
                tipo={tipo}
                active={tipoSel === tipo}
                count={conteoPorTipo[tipo]}
                onClick={() => setTipoSel(tipo)}
              />
            ))}
          </div>

          {cajasDelTipo.length === 0 ? (
            <div className="p-xl flex flex-col items-center justify-center text-center gap-sm min-h-[200px]">
              <Icon name={TIPO_ICON[tipoSel]} size={40} className="text-on-surface-variant" />
              <p className="font-title-md text-title-md text-primary">
                Sin cajas de {TIPO_LABEL[tipoSel]}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
              {cajasDelTipo.map((c) => (
                <CajaCard key={`${c.tipo_bien}-${cajaSlug(c.numero_caja)}`} caja={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TipoTab({ tipo, active, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 border rounded-lg px-4 py-3 transition-all ${
        active
          ? 'border-secondary bg-secondary-fixed text-on-secondary-fixed'
          : 'border-outline-variant hover:bg-surface-container-low text-on-surface'
      }`}
    >
      <Icon name={TIPO_ICON[tipo]} size={20} />
      <span className="font-label-md text-label-md">{TIPO_LABEL[tipo]}</span>
      <span
        className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold ${
          active ? 'bg-on-secondary-fixed/15 text-on-secondary-fixed' : 'bg-surface-variant text-on-surface-variant'
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function CajaCard({ caja }) {
  const esSinCaja = caja.numero_caja == null
  const tipoLabel = TIPO_CAJA_LABEL[caja.tipo_bien] ?? ''
  const titulo = esSinCaja
    ? `Sin caja · ${tipoLabel}`
    : `CAJA ${caja.numero_caja} ${tipoLabel}`
  const incompletos = caja.incompletos ?? 0

  return (
    <Link
      to={`/cajas/${TIPO_SLUG[caja.tipo_bien]}/${cajaSlug(caja.numero_caja)}`}
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
