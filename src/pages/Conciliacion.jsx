import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import {
  TIPO_LABEL,
  TIPO_ICON,
  ESTADO_LABEL,
  expectedAccessories,
  accessoryRow,
  ACC_LABEL,
} from '../lib/assets'

const ESTADOS = ['BUENO', 'REGULAR', 'MALO', 'INOPERATIVO']

export default function Conciliacion() {
  const { id } = useParams()
  // Sin id → índice para buscar/escanear un activo a conciliar.
  if (!id) return <ConciliacionIndex />
  return <ConciliacionDetalle id={id} />
}

// ---------------------------------------------------------------------------
// Índice: buscar un activo por código para iniciar conciliación
// ---------------------------------------------------------------------------
function ConciliacionIndex() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function buscar(e) {
    e.preventDefault()
    setError('')
    if (!code.trim()) return
    setLoading(true)
    const { data, error: qErr } = await supabase
      .from('activos')
      .select('id')
      .eq('codigo_barras', code.trim())
      .single()
    setLoading(false)
    if (qErr || !data) {
      setError('No se encontró ningún activo con ese código.')
      return
    }
    navigate(`/conciliacion/${data.id}`)
  }

  return (
    <div className="p-md md:p-lg max-w-xl mx-auto flex flex-col gap-lg">
      <div>
        <h2 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-primary">
          Conciliación de Auditoría
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Busca un activo por su código de barras para revisar y conciliar su estado.
        </p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm">
        <form className="flex flex-col sm:flex-row gap-sm" onSubmit={buscar}>
          <div className="relative flex-1">
            <Icon name="qr_code_scanner" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código de barras…"
              className="w-full pl-10 pr-4 py-sm bg-surface border border-outline-variant rounded-DEFAULT focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none font-body-sm text-body-sm text-on-surface"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-secondary text-on-secondary px-md py-sm rounded-DEFAULT font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </form>
        {error && <p className="mt-sm font-body-sm text-body-sm text-error">{error}</p>}
        <p className="mt-md font-body-sm text-body-sm text-on-surface-variant">
          ¿Prefieres escanear? Ve a{' '}
          <Link to="/auditoria" className="text-secondary hover:underline">
            Auditoría Móvil
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detalle: conciliación de un activo concreto (PAN-0402)
// ---------------------------------------------------------------------------
function ConciliacionDetalle({ id }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [asset, setAsset] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Estado editable de la auditoría
  const [estadoFound, setEstadoFound] = useState('BUENO')
  const [checklist, setChecklist] = useState({}) // { accKey: boolean }
  const [observacion, setObservacion] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const expected = asset ? expectedAccessories(asset.tipo_bien) : []
  const systemAcc = asset ? accessoryRow(asset) : null

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError('')
      const { data, error } = await supabase
        .from('activos')
        .select('*, accesorios_activos(*)')
        .eq('id', id)
        .single()
      if (cancelled) return
      if (error || !data) {
        setLoadError('No se pudo cargar el activo.')
        setLoading(false)
        return
      }
      setAsset(data)
      setEstadoFound(data.estado_fisico)
      const row = accessoryRow(data)
      const initial = {}
      expectedAccessories(data.tipo_bien).forEach((k) => {
        initial[k] = row ? row[k] === true : false
      })
      setChecklist(initial)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  // Discrepancias: accesorio que el sistema tenía y la auditoría ya no, o cambio de estado.
  const discrepancies = useMemo(() => {
    if (!asset) return []
    const list = []
    expected.forEach((k) => {
      const before = systemAcc ? systemAcc[k] === true : false
      const after = checklist[k] === true
      if (before !== after) {
        list.push({
          key: k,
          label: ACC_LABEL[k],
          tipo: before && !after ? 'faltante' : 'nuevo',
        })
      }
    })
    if (estadoFound !== asset.estado_fisico) {
      list.push({ key: 'estado', label: 'Estado físico', tipo: 'cambio' })
    }
    return list
  }, [asset, expected, systemAcc, checklist, estadoFound])

  const hasDiscrepancies = discrepancies.length > 0
  const matchPct = useMemo(() => {
    const totalChecks = expected.length + 1 // accesorios + estado
    const changed = discrepancies.length
    return Math.round(((totalChecks - changed) / totalChecks) * 100)
  }, [expected.length, discrepancies.length])

  async function guardar() {
    setSaveError('')
    if (hasDiscrepancies && !observacion.trim()) {
      setSaveError('La observación es obligatoria cuando hay discrepancias.')
      return
    }
    setSaving(true)

    // 1) upsert de accesorios (por activo_id único)
    const accPayload = { activo_id: asset.id }
    expected.forEach((k) => {
      accPayload[k] = checklist[k] === true
    })
    const { error: accError } = await supabase
      .from('accesorios_activos')
      .upsert(accPayload, { onConflict: 'activo_id' })
    if (accError) {
      setSaving(false)
      setSaveError(`Error al guardar accesorios: ${accError.message}`)
      return
    }

    // 2) actualizar el activo: estado + verificado = true
    const { error: activoError } = await supabase
      .from('activos')
      .update({ estado_fisico: estadoFound, verificado: true })
      .eq('id', asset.id)
    if (activoError) {
      setSaving(false)
      setSaveError(`Error al actualizar el activo: ${activoError.message}`)
      return
    }

    // 3) registrar el evento en historial_auditoria
    const detalles = {
      estado_fisico: { antes: asset.estado_fisico, despues: estadoFound },
      verificado: { antes: asset.verificado, despues: true },
      accesorios: expected.reduce((acc, k) => {
        acc[k] = { antes: systemAcc ? systemAcc[k] === true : false, despues: checklist[k] === true }
        return acc
      }, {}),
      discrepancias: discrepancies.map((d) => d.label),
    }
    const { error: histError } = await supabase.from('historial_auditoria').insert({
      activo_id: asset.id,
      usuario_id: user?.id ?? null,
      detalles_cambio: detalles,
      observacion: observacion.trim() || 'Conciliación sin discrepancias.',
    })

    setSaving(false)
    if (histError) {
      setSaveError(`Activo verificado, pero falló el registro de historial: ${histError.message}`)
      return
    }

    navigate('/catalogo')
  }

  if (loading) {
    return (
      <div className="p-xl flex justify-center items-center gap-md text-on-surface-variant">
        <Icon name="progress_activity" size={24} className="animate-spin text-secondary" />
        Cargando activo…
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-xl flex flex-col items-center gap-sm text-center">
        <Icon name="error" size={40} className="text-error" filled />
        <p className="font-title-md text-title-md text-primary">{loadError}</p>
        <Link to="/conciliacion" className="text-secondary hover:underline font-label-md text-label-md">
          Volver
        </Link>
      </div>
    )
  }

  return (
    <div className="p-md md:p-lg max-w-container-max mx-auto space-y-lg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
        <div>
          <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm mb-1">
            <Link to="/conciliacion" className="hover:text-secondary">Conciliación</Link>
            <Icon name="chevron_right" size={16} />
            <span className="text-on-surface font-semibold">{asset.codigo_barras}</span>
          </div>
          <h2 className="font-display-lg text-headline-lg-mobile md:text-display-lg font-bold text-primary">
            Conciliación de Auditoría
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Revisa el activo escaneado contra el registro del sistema.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            disabled={saving}
            className="px-4 py-2 border border-outline text-on-surface rounded-DEFAULT font-label-md text-label-md hover:bg-surface-container-high transition-colors disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={saving}
            className="px-4 py-2 bg-secondary text-on-secondary rounded-DEFAULT font-label-md text-label-md hover:opacity-90 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <Icon name="progress_activity" size={18} className="animate-spin" />
            ) : (
              <Icon name="check_circle" size={18} />
            )}
            {saving ? 'Guardando…' : 'Actualizar y verificar'}
          </button>
        </div>
      </div>

      {/* Resumen del activo */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md md:p-lg flex flex-col md:flex-row gap-lg items-start">
        <div className="w-full md:w-28 h-28 bg-surface-container rounded-DEFAULT flex items-center justify-center shrink-0 border border-outline-variant">
          <Icon name={TIPO_ICON[asset.tipo_bien]} className="text-4xl text-on-surface-variant" />
        </div>
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-md">
          <Summary label="Código de barras">
            <span className="font-code-sm text-code-sm text-primary font-bold bg-surface-container-high inline-block px-2 py-1 rounded">
              {asset.codigo_barras}
            </span>
          </Summary>
          <Summary label="Tipo">
            <span className="font-body-md text-body-md text-primary font-semibold">{TIPO_LABEL[asset.tipo_bien]}</span>
          </Summary>
          <Summary label="Marca / Modelo">
            <span className="font-body-md text-body-md text-primary font-semibold">
              {[asset.marca, asset.modelo].filter(Boolean).join(' ') || '—'}
            </span>
          </Summary>
          <Summary label="Ubicación">
            <span className="font-body-md text-body-md text-primary">{asset.ubicacion_actual}</span>
          </Summary>
        </div>
      </div>

      {/* Comparación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-md md:gap-lg">
        {/* Registro del sistema */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
          <div className="bg-surface-container-low px-md py-3 border-b border-outline-variant flex items-center justify-between">
            <h3 className="font-title-md text-title-md font-semibold text-on-surface flex items-center gap-2">
              <Icon name="database" className="text-on-surface-variant" />
              Registro del sistema
            </h3>
            <span className="text-[11px] font-label-md uppercase tracking-wider text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full">
              Solo lectura
            </span>
          </div>
          <div className="p-md space-y-4">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant">Estado registrado</p>
              <p className="font-body-md text-body-md text-primary mt-1">{ESTADO_LABEL[asset.estado_fisico]}</p>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-2">Accesorios registrados</p>
              <div className="bg-surface-container-low border border-outline-variant rounded-DEFAULT p-3">
                <ul className="space-y-2 font-body-sm text-body-sm text-on-surface">
                  {expected.map((k) => {
                    const present = systemAcc ? systemAcc[k] === true : false
                    return (
                      <li key={k} className="flex items-center gap-2">
                        <Icon
                          name={present ? 'check' : 'remove'}
                          size={16}
                          className={present ? 'text-secondary' : 'text-outline'}
                        />
                        <span className={present ? '' : 'text-on-surface-variant'}>{ACC_LABEL[k]}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Estado físico auditado (editable) */}
        <div className="bg-surface-container-lowest border-2 border-secondary/30 rounded-lg overflow-hidden flex flex-col relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-secondary" />
          <div className="px-md py-3 border-b border-outline-variant flex items-center justify-between">
            <h3 className="font-title-md text-title-md font-semibold text-secondary flex items-center gap-2">
              <Icon name="visibility" filled className="text-secondary" />
              Estado físico auditado
            </h3>
            <span className="text-[11px] font-label-md uppercase tracking-wider text-secondary bg-secondary-container px-2 py-0.5 rounded-full">
              Editable
            </span>
          </div>
          <div className="p-md flex flex-col gap-4">
            <div>
              <label className="font-label-md text-label-md text-on-surface-variant block mb-1">Estado encontrado</label>
              <select
                value={estadoFound}
                onChange={(e) => setEstadoFound(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-DEFAULT py-2 px-3 font-body-md text-body-md text-on-surface focus:ring-1 focus:ring-secondary focus:border-secondary outline-none appearance-none"
              >
                {ESTADOS.map((s) => (
                  <option key={s} value={s}>
                    {ESTADO_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="font-label-md text-label-md text-on-surface-variant mb-2 flex items-center justify-between">
                <span>Accesorios presentes</span>
                <span className="text-[10px] font-normal text-error bg-error-container/50 px-1.5 py-0.5 rounded">
                  Desmarca los que falten
                </span>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT p-1">
                {expected.map((k) => {
                  const checked = checklist[k] === true
                  return (
                    <label
                      key={k}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors hover:bg-surface-container-low ${
                        checked ? '' : 'bg-error-container/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setChecklist((c) => ({ ...c, [k]: e.target.checked }))}
                        className="w-4 h-4 text-secondary border-outline-variant rounded-sm focus:ring-secondary"
                      />
                      <span className={`font-body-sm text-body-sm select-none ${checked ? 'text-on-surface' : 'line-through text-on-surface-variant'}`}>
                        {ACC_LABEL[k]}
                      </span>
                      {!checked && (
                        <span className="ml-auto text-[10px] font-label-md text-error uppercase">Falta</span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="font-label-md text-label-md text-on-surface-variant block mb-1">
                Observación / justificación {hasDiscrepancies && <span className="text-error">*</span>}
              </label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder={
                  hasDiscrepancies
                    ? 'Requerido: explica las discrepancias encontradas…'
                    : 'Observaciones adicionales (opcional)…'
                }
                className={`w-full bg-surface-container-lowest border rounded-DEFAULT py-2 px-3 font-body-sm text-body-sm text-on-surface outline-none resize-none h-20 ${
                  hasDiscrepancies
                    ? 'border-error/50 focus:ring-1 focus:ring-error focus:border-error'
                    : 'border-outline-variant focus:ring-1 focus:ring-secondary focus:border-secondary'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de discrepancias */}
      <div
        className={`rounded-lg p-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md border ${
          hasDiscrepancies ? 'bg-error-container border-error/30' : 'bg-secondary-fixed border-secondary/30'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon
            name={hasDiscrepancies ? 'warning' : 'check_circle'}
            filled
            className={hasDiscrepancies ? 'text-on-error-container' : 'text-on-secondary-fixed'}
          />
          <div>
            <h4 className={`font-title-md text-title-md font-semibold ${hasDiscrepancies ? 'text-on-error-container' : 'text-on-secondary-fixed'}`}>
              {hasDiscrepancies ? 'Discrepancias detectadas' : 'Sin discrepancias'}
            </h4>
            <p className={`font-body-sm text-body-sm mt-0.5 ${hasDiscrepancies ? 'text-on-error-container/80' : 'text-on-secondary-fixed/80'}`}>
              {hasDiscrepancies
                ? discrepancies.map((d) => d.label).join(', ')
                : 'El estado físico coincide con el registro del sistema.'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className={`font-body-sm text-body-sm block mb-1 ${hasDiscrepancies ? 'text-on-error-container/80' : 'text-on-secondary-fixed/80'}`}>
            Coincidencia
          </span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div className={`h-full ${hasDiscrepancies ? 'bg-error' : 'bg-secondary'}`} style={{ width: `${matchPct}%` }} />
            </div>
            <span className={`font-label-md text-label-md ${hasDiscrepancies ? 'text-on-error-container' : 'text-on-secondary-fixed'}`}>
              {matchPct}%
            </span>
          </div>
        </div>
      </div>

      {saveError && (
        <div className="flex items-start gap-xs bg-error-container text-on-error-container rounded-DEFAULT px-md py-sm font-body-sm text-body-sm">
          <Icon name="error" size={18} filled />
          <span>{saveError}</span>
        </div>
      )}
    </div>
  )
}

function Summary({ label, children }) {
  return (
    <div>
      <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  )
}
