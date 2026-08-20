import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabaseClient'
import { TIPO_LABEL, ESTADO_LABEL, isComplete } from '../lib/assets'
import { downloadXLSX, generarActaInventario } from '../lib/reportes'

const ESTADOS = ['BUENO', 'REGULAR', 'MALO', 'INOPERATIVO']

const initialFilters = {
  tipo: '',
  ubicacion: '',
  estado: '',
  verificados: true,
  pendientes: true,
  desde: '',
  hasta: '',
}

export default function Reportes() {
  const [activos, setActivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(initialFilters)
  const PREVIEW = 50

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

  const ubicaciones = useMemo(
    () => [...new Set(activos.map((a) => a.ubicacion_actual).filter(Boolean))].sort(),
    [activos]
  )

  const setF = (name, value) => setFilters((f) => ({ ...f, [name]: value }))

  const filtered = useMemo(() => {
    return activos.filter((a) => {
      if (filters.tipo && a.tipo_bien !== filters.tipo) return false
      if (filters.ubicacion && a.ubicacion_actual !== filters.ubicacion) return false
      if (filters.estado && a.estado_fisico !== filters.estado) return false
      // Verificación
      if (a.verificado && !filters.verificados) return false
      if (!a.verificado && !filters.pendientes) return false
      // Rango de fechas (created_at)
      if (filters.desde && new Date(a.created_at) < new Date(filters.desde)) return false
      if (filters.hasta) {
        const hasta = new Date(filters.hasta)
        hasta.setHours(23, 59, 59, 999)
        if (new Date(a.created_at) > hasta) return false
      }
      return true
    })
  }, [activos, filters])

  const filtroTexto = useMemo(() => {
    const parts = []
    if (filters.tipo) parts.push(TIPO_LABEL[filters.tipo])
    if (filters.ubicacion) parts.push(filters.ubicacion)
    if (filters.estado) parts.push(ESTADO_LABEL[filters.estado])
    if (!filters.verificados) parts.push('sin verificados')
    if (!filters.pendientes) parts.push('sin pendientes')
    if (filters.desde) parts.push(`desde ${filters.desde}`)
    if (filters.hasta) parts.push(`hasta ${filters.hasta}`)
    return parts.length ? parts.join(', ') : 'Todos los registros'
  }, [filters])

  return (
    <div className="p-md md:p-lg max-w-container-max mx-auto flex flex-col gap-lg">
      {/* Header */}
      <div>
        <h1 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-primary mb-1">
          Módulo de Reportes
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Generación de actas y exportación consolidada para auditorías.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Filtros */}
        <div className="lg:col-span-3">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md">
            <h3 className="font-title-md text-title-md text-primary mb-md flex items-center gap-2 border-b border-outline-variant pb-2">
              <Icon name="tune" size={20} />
              Filtros del reporte
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Categoría</label>
                <select className={selectCls} value={filters.tipo} onChange={(e) => setF('tipo', e.target.value)}>
                  <option value="">Todas las categorías</option>
                  <option value="TABLET">Tablets PC</option>
                  <option value="PANEL_SOLAR">Paneles Solares</option>
                </select>
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Ubicación</label>
                <select className={selectCls} value={filters.ubicacion} onChange={(e) => setF('ubicacion', e.target.value)}>
                  <option value="">Todas las ubicaciones</option>
                  {ubicaciones.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Estado físico</label>
                <select className={selectCls} value={filters.estado} onChange={(e) => setF('estado', e.target.value)}>
                  <option value="">Todos los estados</option>
                  {ESTADOS.map((s) => (
                    <option key={s} value={s}>
                      {ESTADO_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Verificación</label>
                <div className="space-y-2 mt-2">
                  <CheckRow label="Verificados" checked={filters.verificados} onChange={(v) => setF('verificados', v)} />
                  <CheckRow label="Pendientes" checked={filters.pendientes} onChange={(v) => setF('pendientes', v)} />
                </div>
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Rango de fechas (registro)</label>
                <input type="date" className={`${selectCls} mb-2`} value={filters.desde} onChange={(e) => setF('desde', e.target.value)} />
                <input type="date" className={selectCls} value={filters.hasta} onChange={(e) => setF('hasta', e.target.value)} />
              </div>
              <button
                onClick={() => setFilters(initialFilters)}
                className="w-full bg-surface-container-highest text-on-surface font-label-md text-label-md py-2 px-4 rounded-DEFAULT hover:bg-outline-variant transition-colors mt-2"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {/* Datos */}
        <div className="lg:col-span-9 flex flex-col gap-md">
          {/* Toolbar */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
              <Icon name="info" size={20} />
              <span className="font-body-sm text-body-sm">
                {loading ? 'Cargando…' : `${filtered.length} registro(s) listos para exportar según los filtros.`}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadXLSX(filtered, 'reporte-inventario.xlsx')}
                disabled={filtered.length === 0}
                className="flex items-center gap-2 bg-surface-container text-on-surface border border-outline-variant font-label-md text-label-md py-2 px-4 rounded-DEFAULT hover:bg-surface-container-highest transition-colors disabled:opacity-50"
              >
                <Icon name="table" size={18} />
                Exportar Excel (.xlsx)
              </button>
              <button
                onClick={() => generarActaInventario(filtered, { filtro: filtroTexto })}
                disabled={filtered.length === 0}
                className="flex items-center gap-2 bg-secondary text-on-secondary font-label-md text-label-md py-2 px-4 rounded-DEFAULT hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Icon name="picture_as_pdf" size={18} />
                Generar Acta (PDF)
              </button>
            </div>
          </div>

          {/* Tabla preview */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
            <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-title-md text-title-md text-primary">Vista previa de exportación</h3>
            </div>
            {error ? (
              <div className="p-lg text-center text-error font-body-sm text-body-sm">{error}</div>
            ) : loading ? (
              <div className="p-lg flex justify-center items-center gap-md text-on-surface-variant">
                <Icon name="progress_activity" size={22} className="animate-spin text-secondary" />
                Cargando…
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-xl text-center font-body-sm text-body-sm text-on-surface-variant">
                Ningún registro coincide con los filtros.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[720px]">
                  <thead>
                    <tr className="bg-surface-container-lowest border-b border-outline-variant">
                      <Th>Cód. barras</Th>
                      <Th>Tipo</Th>
                      <Th>Marca / Modelo</Th>
                      <Th>Ubicación</Th>
                      <Th>Estado</Th>
                    </tr>
                  </thead>
                  <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant">
                    {filtered.slice(0, PREVIEW).map((a) => (
                      <tr key={a.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-3 px-4 font-code-sm text-code-sm text-primary">{a.codigo_barras}</td>
                        <td className="py-3 px-4 text-on-surface-variant">{TIPO_LABEL[a.tipo_bien]}</td>
                        <td className="py-3 px-4 font-semibold text-primary">
                          {[a.marca, a.modelo].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant">{a.ubicacion_actual}</td>
                        <td className="py-3 px-4">
                          <StatusBadge activo={a} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && filtered.length > 0 && (
              <div className="p-md border-t border-outline-variant bg-surface-container-low text-body-sm text-on-surface-variant">
                Mostrando {Math.min(PREVIEW, filtered.length)} de {filtered.length} resultados
                {filtered.length > PREVIEW && ' (la exportación incluye todos)'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ activo }) {
  if (!activo.verificado) {
    return <Badge cls="bg-[#fef08a] text-[#854d0e]">Pendiente</Badge>
  }
  if (!isComplete(activo)) {
    return <Badge cls="bg-[#fee2e2] text-[#991b1b]">Incompleto</Badge>
  }
  return <Badge cls="bg-[#dcfce7] text-[#166534]">Verificado</Badge>
}

function Badge({ cls, children }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>{children}</span>
}

function Th({ children }) {
  return <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">{children}</th>
}

function CheckRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="text-secondary border-outline-variant rounded-sm focus:ring-secondary h-4 w-4"
      />
      <span className="font-body-sm text-body-sm">{label}</span>
    </label>
  )
}

const selectCls =
  'w-full bg-surface-container-low border border-outline-variant rounded-DEFAULT py-2 px-3 text-body-sm text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary outline-none'
