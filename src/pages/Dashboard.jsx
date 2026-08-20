import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabaseClient'
import { TIPO_LABEL, isComplete, missingAccessories } from '../lib/assets'

export default function Dashboard() {
  const [activos, setActivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error: qErr } = await supabase
        .from('activos')
        .select('*, accesorios_activos(*)')
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (qErr) setError(qErr.message)
      else setActivos(data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const tablets = activos.filter((a) => a.tipo_bien === 'TABLET').length
    const paneles = activos.filter((a) => a.tipo_bien === 'PANEL_SOLAR').length
    const verificados = activos.filter((a) => a.verificado).length
    const incompletos = activos.filter((a) => !isComplete(a))
    const total = activos.length
    const pctVerificados = total ? Math.round((verificados / total) * 100) : 0

    // Distribución por ubicación (top 5 por total)
    const byLoc = {}
    activos.forEach((a) => {
      const loc = a.ubicacion_actual || '—'
      byLoc[loc] = byLoc[loc] || { loc, tablets: 0, paneles: 0 }
      if (a.tipo_bien === 'TABLET') byLoc[loc].tablets += 1
      else byLoc[loc].paneles += 1
    })
    const distribucion = Object.values(byLoc)
      .sort((a, b) => b.tablets + b.paneles - (a.tablets + a.paneles))
      .slice(0, 5)
    const maxLoc = Math.max(1, ...distribucion.map((d) => d.tablets + d.paneles))

    return {
      tablets,
      paneles,
      verificados,
      incompletos,
      total,
      pctVerificados,
      distribucion,
      maxLoc,
    }
  }, [activos])

  if (loading) {
    return (
      <div className="p-xl flex justify-center items-center gap-md text-on-surface-variant">
        <Icon name="progress_activity" size={24} className="animate-spin text-secondary" />
        Cargando panel…
      </div>
    )
  }

  return (
    <div className="p-md md:p-lg max-w-container-max mx-auto flex flex-col gap-lg">
      {/* Header */}
      <div>
        <h2 className="font-headline-lg text-headline-lg text-primary">Resumen de Inventario</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Vista ejecutiva y KPIs en tiempo real de tablets y paneles solares.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-xs bg-error-container text-on-error-container rounded-DEFAULT px-md py-sm font-body-sm text-body-sm">
          <Icon name="error" size={18} filled />
          <span>{error}</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <KpiCard label="Total Tablets" value={stats.tablets} icon="tablet_mac" iconWrap="bg-secondary-fixed" iconColor="text-on-secondary-fixed" />
        <KpiCard label="Total Paneles" value={stats.paneles} icon="solar_power" iconWrap="bg-tertiary-fixed" iconColor="text-on-tertiary-fixed" />
        <KpiCard
          label="Verificados"
          value={stats.verificados}
          icon="check_circle"
          iconFilled
          iconWrap="bg-[rgba(34,197,94,0.12)]"
          iconColor="text-[rgb(21,128,61)]"
          hint={`${stats.pctVerificados}% del inventario`}
        />
        <KpiCard
          label="Accesorios Faltantes"
          value={stats.incompletos.length}
          icon="warning"
          iconWrap="bg-error-container"
          iconColor="text-on-error-container"
          valueColor="text-error"
          hint="Requiere atención"
          hintColor="text-error"
          alert
        />
      </div>

      {/* Gráficos + alertas */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Distribución por ubicación */}
        <div className="md:col-span-8 bg-surface-container-lowest border border-outline-variant rounded p-md flex flex-col min-h-[320px]">
          <div className="flex justify-between items-center mb-md">
            <h3 className="font-title-md text-title-md text-primary">Distribución por Ubicación</h3>
            <div className="flex gap-lg">
              <Legend color="bg-secondary" label="Tablets" />
              <Legend color="bg-tertiary-container" label="Paneles" />
            </div>
          </div>
          {stats.distribucion.length === 0 ? (
            <EmptyMini text="Sin datos para graficar." />
          ) : (
            <div className="flex-1 flex items-end justify-around gap-md pt-lg border-b border-outline-variant pb-2">
              {stats.distribucion.map((d) => (
                <div key={d.loc} className="flex flex-col items-center gap-sm flex-1 min-w-0">
                  <div className="w-full flex gap-1 justify-center items-end h-48">
                    <div
                      className="w-6 md:w-8 bg-secondary rounded-t hover:opacity-80 transition-opacity"
                      style={{ height: `${(d.tablets / stats.maxLoc) * 100}%` }}
                      title={`${d.loc}: ${d.tablets} tablets`}
                    />
                    <div
                      className="w-6 md:w-8 bg-tertiary-container rounded-t hover:opacity-80 transition-opacity"
                      style={{ height: `${(d.paneles / stats.maxLoc) * 100}%` }}
                      title={`${d.loc}: ${d.paneles} paneles`}
                    />
                  </div>
                  <span className="font-label-md text-label-md text-on-surface-variant text-center truncate w-full">
                    {d.loc}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lateral: progreso + alertas */}
        <div className="md:col-span-4 flex flex-col gap-gutter">
          {/* Donut progreso */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded p-md flex flex-col items-center justify-center relative min-h-[180px]">
            <h3 className="font-title-md text-title-md text-primary absolute top-md left-md">Progreso de Auditoría</h3>
            <div className="relative w-28 h-28 mt-md">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle className="stroke-surface-container-highest" cx="18" cy="18" fill="none" r="15.915" strokeWidth="4" />
                <circle
                  className="stroke-secondary"
                  cx="18"
                  cy="18"
                  fill="none"
                  r="15.915"
                  strokeWidth="4"
                  strokeDasharray={`${stats.pctVerificados}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-title-md text-title-md text-primary font-bold">{stats.pctVerificados}%</span>
              </div>
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant mt-sm text-center">
              {stats.verificados} de {stats.total} verificados
            </p>
          </div>

          {/* Alertas: incompletos */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded flex-1 flex flex-col overflow-hidden">
            <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-title-md text-title-md text-primary flex items-center gap-xs">
                <Icon name="error" filled className="text-error" size={20} />
                Accesorios Faltantes
              </h3>
              <Link to="/catalogo" className="text-body-sm font-body-sm text-secondary hover:underline">
                Ver todo
              </Link>
            </div>
            {stats.incompletos.length === 0 ? (
              <EmptyMini text="Todo el inventario está completo. 🎉" />
            ) : (
              <ul className="flex-1 overflow-y-auto divide-y divide-outline-variant max-h-64">
                {stats.incompletos.slice(0, 8).map((a) => (
                  <li key={a.id} className="p-sm flex justify-between items-start gap-sm">
                    <div className="min-w-0">
                      <div className="font-label-md text-label-md text-primary truncate">
                        {a.codigo_barras} · {TIPO_LABEL[a.tipo_bien]}
                      </div>
                      <div className="text-code-sm font-code-sm text-on-surface-variant truncate">{a.ubicacion_actual}</div>
                    </div>
                    <span className="bg-error-container text-on-error-container px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">
                      {missingAccessories(a)[0] ?? 'Incompleto'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon, iconFilled, iconWrap, iconColor, valueColor = 'text-primary', hint, hintColor = 'text-on-surface-variant', alert }) {
  return (
    <div className={`bg-surface-container-lowest border border-outline-variant rounded p-md flex flex-col justify-between h-32 ${alert ? 'border-l-4 border-l-error' : ''}`}>
      <div className="flex justify-between items-start">
        <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconWrap} ${iconColor}`}>
          <Icon name={icon} size={18} filled={iconFilled} />
        </div>
      </div>
      <div>
        <div className={`font-display-lg text-display-lg ${valueColor}`}>{value}</div>
        {hint && <div className={`text-body-sm font-body-sm mt-xs ${hintColor}`}>{hint}</div>}
      </div>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-xs font-label-md text-label-md text-on-surface-variant">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      {label}
    </div>
  )
}

function EmptyMini({ text }) {
  return (
    <div className="flex-1 flex items-center justify-center p-lg text-center font-body-sm text-body-sm text-on-surface-variant">
      {text}
    </div>
  )
}
