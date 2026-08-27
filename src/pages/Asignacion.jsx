import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import BarcodeScanner from '../components/BarcodeScanner'
import UbicacionSelect from '../components/UbicacionSelect'
import { supabase } from '../lib/supabaseClient'
import { TIPO_LABEL, TIPO_ICON, ESTADO_LABEL, estadoBadgeClasses } from '../lib/assets'
import { useToast } from '../context/ToastContext'

const ESTADOS_ENTREGA = ['ENTREGADO', 'PENDIENTE']

// Fecha-hora local en formato para <input type="datetime-local">
function nowLocal() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

function emptyForm() {
  return {
    responsable_dni: '',
    responsable_nombre: '',
    area_aula: '',
    fecha_salida: nowLocal(),
    estado_entrega: 'ENTREGADO',
    observaciones: '',
  }
}

export default function Asignacion() {
  const [asset, setAsset] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [recientes, setRecientes] = useState([])
  const toast = useToast()

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function loadRecientes() {
    const { data } = await supabase
      .from('asignaciones')
      .select('*, activos(codigo_barras, tipo_bien, marca, modelo)')
      .order('fecha_salida', { ascending: false })
      .limit(8)
    setRecientes(data ?? [])
  }

  useEffect(() => {
    loadRecientes()
  }, [])

  async function guardar(e) {
    e.preventDefault()

    if (!asset) {
      toast.error('Selecciona un activo primero (escanea o busca su código).')
      return
    }
    if (!form.responsable_nombre.trim()) {
      toast.error('El nombre del responsable es obligatorio.')
      return
    }
    if (!form.area_aula.trim()) {
      toast.error('El área / aula de destino es obligatoria.')
      return
    }

    setSaving(true)

    // 1) Insertar la asignación
    const { error: asigError } = await supabase.from('asignaciones').insert({
      activo_id: asset.id,
      responsable_dni: form.responsable_dni.trim() || null,
      responsable_nombre: form.responsable_nombre.trim(),
      area_aula: form.area_aula.trim(),
      fecha_salida: new Date(form.fecha_salida).toISOString(),
      estado_entrega: form.estado_entrega,
      observaciones: form.observaciones.trim() || null,
    })
    if (asigError) {
      setSaving(false)
      toast.error(`Error al registrar la asignación: ${asigError.message}`)
      return
    }

    // 2) Actualizar la ubicación actual del activo al destino
    const { error: updError } = await supabase
      .from('activos')
      .update({ ubicacion_actual: form.area_aula.trim() })
      .eq('id', asset.id)

    setSaving(false)
    if (updError) {
      toast.error(`Asignación registrada, pero falló actualizar la ubicación: ${updError.message}`)
      return
    }

    toast.success(`Equipo ${asset.codigo_barras} asignado a ${form.responsable_nombre.trim()}.`)
    setAsset(null)
    setForm(emptyForm())
    loadRecientes()
  }

  return (
    <div className="p-md md:p-lg max-w-container-max mx-auto flex flex-col gap-lg">
      {/* Header */}
      <div>
        <h2 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-primary">
          Asignación y Salida de Equipos
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Registra la salida de un activo hacia un responsable y ubicación de destino.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Columna izquierda: selección + formulario */}
        <div className="lg:col-span-2 flex flex-col gap-lg">
          {/* Paso 1: seleccionar activo */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm">
            <div className="px-md py-3 border-b border-outline-variant flex items-center gap-2">
              <StepBadge n={1} />
              <h3 className="font-title-md text-title-md text-primary">Seleccionar activo</h3>
            </div>
            <div className="p-md">
              {asset ? (
                <SelectedAsset asset={asset} onClear={() => setAsset(null)} />
              ) : (
                <AssetPicker onSelect={setAsset} onError={toast.error} />
              )}
            </div>
          </div>

          {/* Paso 2: datos de la salida */}
          <form onSubmit={guardar} className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm">
            <div className="px-md py-3 border-b border-outline-variant flex items-center gap-2">
              <StepBadge n={2} />
              <h3 className="font-title-md text-title-md text-primary">Datos de la salida</h3>
            </div>
            <div className="p-md grid grid-cols-1 md:grid-cols-2 gap-md">
              <Field label="DNI del responsable">
                <input
                  className={inputCls}
                  value={form.responsable_dni}
                  onChange={(e) => setField('responsable_dni', e.target.value)}
                  placeholder="Ej. 12345678"
                  inputMode="numeric"
                />
              </Field>
              <Field label="Nombre completo *">
                <input
                  className={inputCls}
                  value={form.responsable_nombre}
                  onChange={(e) => setField('responsable_nombre', e.target.value)}
                  placeholder="Ej. Juan Pérez"
                />
              </Field>
              <Field label="Área / Aula de destino *">
                <UbicacionSelect
                  className={inputCls}
                  value={form.area_aula}
                  onChange={(v) => setField('area_aula', v)}
                />
              </Field>
              <Field label="Fecha de salida *">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={form.fecha_salida}
                  onChange={(e) => setField('fecha_salida', e.target.value)}
                />
              </Field>
              <Field label="Estado de entrega">
                <select
                  className={`${inputCls} appearance-none`}
                  value={form.estado_entrega}
                  onChange={(e) => setField('estado_entrega', e.target.value)}
                >
                  {ESTADOS_ENTREGA.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Observaciones adicionales">
                  <textarea
                    rows={3}
                    className={inputCls}
                    value={form.observaciones}
                    onChange={(e) => setField('observaciones', e.target.value)}
                    placeholder="Notas sobre la entrega…"
                  />
                </Field>
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-lg bg-secondary text-on-secondary font-label-md text-label-md hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2 disabled:opacity-60"
                >
                  {saving ? (
                    <Icon name="progress_activity" size={18} className="animate-spin" />
                  ) : (
                    <Icon name="assignment_turned_in" size={18} />
                  )}
                  {saving ? 'Registrando…' : 'Registrar salida'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Columna derecha: asignaciones recientes */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm flex flex-col overflow-hidden">
          <div className="px-md py-3 border-b border-outline-variant bg-surface-container-low">
            <h3 className="font-title-md text-title-md text-primary">Salidas recientes</h3>
          </div>
          {recientes.length === 0 ? (
            <div className="p-lg text-center font-body-sm text-body-sm text-on-surface-variant">
              Aún no hay asignaciones registradas.
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant overflow-y-auto">
              {recientes.map((r) => (
                <li key={r.id} className="p-md flex items-start gap-sm">
                  <Icon
                    name={r.activos ? TIPO_ICON[r.activos.tipo_bien] : 'inventory_2'}
                    size={18}
                    className="text-on-surface-variant mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-code-sm text-code-sm font-semibold text-primary truncate">
                      {r.activos?.codigo_barras ?? '—'}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface truncate">
                      {r.responsable_nombre} · {r.area_aula}
                    </p>
                    <p className="font-body-sm text-[11px] text-on-surface-variant">
                      {new Date(r.fecha_salida).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-[10px] font-label-md uppercase tracking-wider text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full shrink-0">
                    {r.estado_entrega}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Selección de activo: búsqueda rápida + escaneo -------------------------
function AssetPicker({ onSelect, onError }) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [scan, setScan] = useState(false)

  async function search(codigo) {
    const q = (codigo ?? term).trim()
    if (!q) return
    setLoading(true)
    const { data, error } = await supabase
      .from('activos')
      .select('*, accesorios_activos(*)')
      .or(`codigo_barras.ilike.%${q}%,codigo_patrimonial.ilike.%${q}%`)
      .limit(8)
    setLoading(false)
    if (error) {
      onError?.(error.message)
      return
    }
    setResults(data ?? [])
    if ((data ?? []).length === 1) onSelect(data[0])
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex gap-sm">
        <div className="relative flex-1">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), search())}
            placeholder="Buscar por código de barras o patrimonial…"
            className="w-full pl-10 pr-4 py-sm bg-surface border border-outline-variant rounded-DEFAULT focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none font-body-sm text-body-sm text-on-surface"
          />
        </div>
        <button
          type="button"
          onClick={() => search()}
          className="bg-secondary text-on-secondary px-md rounded-DEFAULT font-label-md text-label-md hover:opacity-90 transition-opacity"
        >
          Buscar
        </button>
        <button
          type="button"
          onClick={() => setScan((v) => !v)}
          className={`px-md rounded-DEFAULT border font-label-md text-label-md transition-colors flex items-center gap-1 ${
            scan ? 'bg-secondary-fixed text-on-secondary-fixed border-secondary' : 'border-outline text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <Icon name="barcode_scanner" size={18} />
        </button>
      </div>

      {scan && (
        <BarcodeScanner
          active={scan}
          onDetected={(code) => {
            setScan(false)
            setTerm(code)
            search(code)
          }}
        />
      )}

      {loading && (
        <div className="flex items-center gap-sm text-on-surface-variant font-body-sm text-body-sm">
          <Icon name="progress_activity" size={18} className="animate-spin text-secondary" />
          Buscando…
        </div>
      )}

      {!loading && results.length > 0 && (
        <ul className="border border-outline-variant rounded-DEFAULT divide-y divide-outline-variant overflow-hidden">
          {results.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onSelect(a)}
                className="w-full text-left p-sm hover:bg-surface-container-low transition-colors flex items-center gap-sm"
              >
                <Icon name={TIPO_ICON[a.tipo_bien]} size={18} className="text-on-surface-variant" />
                <div className="flex-1 min-w-0">
                  <p className="font-code-sm text-code-sm font-semibold text-primary">{a.codigo_barras}</p>
                  <p className="font-body-sm text-[12px] text-on-surface-variant truncate">
                    {TIPO_LABEL[a.tipo_bien]} · {a.ubicacion_actual}
                  </p>
                </div>
                <Icon name="chevron_right" size={18} className="text-on-surface-variant" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SelectedAsset({ asset, onClear }) {
  return (
    <div className="flex items-center gap-md bg-surface-container-low border border-outline-variant rounded-DEFAULT p-md">
      <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center border border-outline-variant shrink-0">
        <Icon
          name={TIPO_ICON[asset.tipo_bien]}
          className={asset.tipo_bien === 'TABLET' ? 'text-secondary' : 'text-tertiary-container'}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-code-sm text-code-sm font-bold text-primary">{asset.codigo_barras}</p>
        <p className="font-body-sm text-body-sm text-on-surface truncate">
          {TIPO_LABEL[asset.tipo_bien]} · {[asset.marca, asset.modelo].filter(Boolean).join(' ') || '—'}
        </p>
        <p className="font-body-sm text-[12px] text-on-surface-variant">Ubicación actual: {asset.ubicacion_actual}</p>
      </div>
      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${estadoBadgeClasses(asset.estado_fisico)}`}>
        {ESTADO_LABEL[asset.estado_fisico] ?? asset.estado_fisico}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="p-1 text-on-surface-variant hover:text-error rounded transition-colors"
        title="Cambiar activo"
      >
        <Icon name="close" size={20} />
      </button>
    </div>
  )
}

function StepBadge({ n }) {
  return (
    <span className="w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-label-md text-label-md font-bold">
      {n}
    </span>
  )
}

const inputCls =
  'w-full border border-outline-variant rounded-lg py-2 px-3 bg-surface-container-lowest focus:ring-2 focus:ring-secondary focus:border-secondary text-body-md text-on-surface outline-none transition-colors'

function Field({ label, children }) {
  return (
    <div>
      <label className="block font-label-md text-label-md text-on-surface mb-1">{label}</label>
      {children}
    </div>
  )
}
