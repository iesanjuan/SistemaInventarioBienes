import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import ScannerModal from '../components/ScannerModal'
import UbicacionSelect, { UBICACION_ALMACEN } from '../components/UbicacionSelect'
import OptionSelect from '../components/OptionSelect'
import { MARCAS, MODELOS, defaultMarca, defaultModelo } from '../lib/modelos'
import { supabase } from '../lib/supabaseClient'

const ESTADOS = [
  { value: 'POR_EVALUAR', label: 'Por evaluar' },
  { value: 'BUENO', label: 'Bueno' },
  { value: 'REGULAR', label: 'Regular' },
  { value: 'MALO', label: 'Malo' },
  { value: 'INOPERATIVO', label: 'Inoperativo' },
]

const EMPTY_ACC = {
  cargador: false,
  funda: false,
  pin_sim: false,
  cable_suministro: false,
  tiene_panel: false,
}

function emptyForm() {
  return {
    tipo_bien: 'TABLET',
    codigo_barras: '',
    numero_caja: '',
    marca: defaultMarca('TABLET'),
    modelo: defaultModelo('TABLET'),
    estado_fisico: 'POR_EVALUAR',
    tiene_caja: true,
    tiene_equipo: true,
    ubicacion_actual: UBICACION_ALMACEN,
    observaciones: '',
    accesorios: { ...EMPTY_ACC },
  }
}

// Convierte la fila de la BD (activo + accesorios) al estado del formulario.
function formFromActivo(activo) {
  const acc = Array.isArray(activo.accesorios_activos)
    ? activo.accesorios_activos[0]
    : activo.accesorios_activos
  return {
    tipo_bien: activo.tipo_bien,
    codigo_barras: activo.codigo_barras ?? '',
    numero_caja: activo.numero_caja != null ? String(activo.numero_caja) : '',
    marca: activo.marca ?? '',
    modelo: activo.modelo ?? '',
    estado_fisico: activo.estado_fisico ?? 'POR_EVALUAR',
    tiene_caja: activo.tiene_caja ?? true,
    tiene_equipo: activo.tiene_equipo ?? true,
    ubicacion_actual: activo.ubicacion_actual ?? UBICACION_ALMACEN,
    observaciones: activo.observaciones ?? '',
    accesorios: {
      cargador: acc?.cargador ?? false,
      funda: acc?.funda ?? false,
      pin_sim: acc?.pin_sim ?? false,
      cable_suministro: acc?.cable_suministro ?? false,
      tiene_panel: acc?.tiene_panel ?? false,
    },
  }
}

export default function Registro() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [scanOpen, setScanOpen] = useState(false)

  const isTablet = form.tipo_bien === 'TABLET'

  // En modo edición, cargamos el activo y precargamos el formulario.
  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError('')
      const { data, error: qErr } = await supabase
        .from('activos')
        .select('*, accesorios_activos(*)')
        .eq('id', id)
        .single()
      if (cancelled) return
      if (qErr || !data) {
        setLoadError('No se pudo cargar el activo que quieres editar.')
        setLoading(false)
        return
      }
      setForm(formFromActivo(data))
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
  }
  function setAcc(name, value) {
    setForm((f) => ({ ...f, accesorios: { ...f.accesorios, [name]: value } }))
  }

  function setTipo(tipo) {
    // Al cambiar de categoría, reseteamos accesorios, marca y modelo
    // (las opciones aplican distinto por tipo).
    setForm((f) => ({
      ...f,
      tipo_bien: tipo,
      marca: defaultMarca(tipo),
      modelo: defaultModelo(tipo),
      accesorios: { ...EMPTY_ACC },
    }))
  }

  async function save({ addAnother }) {
    setError('')
    setSuccess('')

    if (!form.codigo_barras.trim()) {
      setError('El código de barras es obligatorio.')
      return
    }
    if (!String(form.numero_caja).trim()) {
      setError('El número de caja es obligatorio.')
      return
    }
    // Debe existir al menos una parte física del conjunto.
    if (!form.tiene_caja && !form.tiene_equipo) {
      setError('Debe estar presente al menos la caja o el equipo.')
      return
    }
    // La ubicación siempre es obligatoria: el conjunto (o lo que quede de él)
    // se encuentra físicamente en algún lugar (p. ej. el almacén).
    if (!form.ubicacion_actual.trim()) {
      setError('La ubicación es obligatoria.')
      return
    }

    setSaving(true)

    const payload = {
      codigo_barras: form.codigo_barras.trim(),
      numero_caja: parseInt(form.numero_caja, 10),
      tipo_bien: form.tipo_bien,
      // Marca/modelo describen el conjunto (qué debería contener), aunque falte el equipo.
      marca: form.marca.trim() || null,
      modelo: form.modelo.trim() || null,
      // El estado físico solo aplica si hay equipo que evaluar.
      estado_fisico: form.tiene_equipo ? form.estado_fisico : 'POR_EVALUAR',
      tiene_caja: form.tiene_caja,
      tiene_equipo: form.tiene_equipo,
      ubicacion_actual: form.ubicacion_actual.trim(),
      observaciones: form.observaciones.trim() || null,
    }

    // 1) Crear (insert) o actualizar (update) el activo.
    const query = isEdit
      ? supabase.from('activos').update(payload).eq('id', id).select().single()
      : supabase.from('activos').insert(payload).select().single()

    const { data: activo, error: activoError } = await query

    if (activoError) {
      setSaving(false)
      if (activoError.code === '23505') {
        setError('Ya existe un activo con ese código de barras.')
      } else {
        setError(activoError.message)
      }
      return
    }

    // 2) Guardar los accesorios (upsert por activo_id único).
    //    Los accesorios son independientes: puede haber caja + accesorios sin
    //    la tablet, o la tablet sin accesorios.
    const acc = isTablet
      ? {
          cargador: form.accesorios.cargador,
          funda: form.accesorios.funda,
          pin_sim: form.accesorios.pin_sim,
        }
      : {
          tiene_panel: form.accesorios.tiene_panel,
          cable_suministro: form.accesorios.cable_suministro,
        }

    const { error: accError } = await supabase
      .from('accesorios_activos')
      .upsert({ activo_id: activo.id, ...acc }, { onConflict: 'activo_id' })

    setSaving(false)

    if (accError) {
      setError(
        `${isEdit ? 'Cambios guardados' : 'Activo creado'}, pero falló el registro de accesorios: ${accError.message}`
      )
      return
    }

    if (isEdit) {
      navigate('/catalogo')
    } else if (addAnother) {
      setForm(emptyForm())
      setSuccess(`Activo ${activo.codigo_barras} registrado. Puedes añadir otro.`)
    } else {
      navigate('/catalogo')
    }
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
        <button
          onClick={() => navigate('/catalogo')}
          className="text-secondary hover:underline font-label-md text-label-md"
        >
          Volver al catálogo
        </button>
      </div>
    )
  }

  return (
    <div className="p-md md:p-lg">
      {/* Header */}
      <div className="mb-lg">
        <h2 className="font-display-lg text-display-lg text-primary">
          {isEdit ? 'Editar Activo' : 'Registro de Activos'}
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          {isEdit
            ? 'Corrige los datos de un activo ya registrado.'
            : 'Da de alta nuevos activos físicos en el sistema de seguimiento.'}
        </p>
      </div>

      <div className="max-w-4xl mx-auto bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
        <form
          className="space-y-lg"
          onSubmit={(e) => {
            e.preventDefault()
            save({ addAnother: false })
          }}
        >
          {/* Categoría */}
          <div>
            <h3 className="font-title-md text-title-md text-primary mb-md">Categoría del activo</h3>
            <div className="flex gap-4">
              <CategoryCard
                active={isTablet}
                icon="tablet_mac"
                label="Tablet PC"
                onClick={() => setTipo('TABLET')}
              />
              <CategoryCard
                active={!isTablet}
                icon="solar_power"
                label="Panel Solar"
                onClick={() => setTipo('PANEL_SOLAR')}
              />
            </div>
          </div>

          <hr className="border-outline-variant" />

          {/* Identificación */}
          <div>
            <h3 className="font-title-md text-title-md text-primary mb-md">Identificación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <Field label="Código de barras / Serie *">
                <div className="relative">
                  <input
                    className={`${inputCls} pr-10`}
                    placeholder="Escanea o escribe el código"
                    value={form.codigo_barras}
                    onChange={(e) => setField('codigo_barras', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setScanOpen(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:bg-secondary-fixed rounded-DEFAULT p-1 transition-colors"
                    title="Escanear con la cámara"
                    aria-label="Escanear con la cámara"
                  >
                    <Icon name="barcode_scanner" size={20} />
                  </button>
                </div>
              </Field>
              <Field label="Número de caja *">
                <input
                  type="number"
                  min="1"
                  className={inputCls}
                  placeholder="Ej. 63"
                  value={form.numero_caja}
                  onChange={(e) => setField('numero_caja', e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* Especificaciones */}
          <div>
            <h3 className="font-title-md text-title-md text-primary mb-md">Especificaciones</h3>

            {/* Componentes presentes del conjunto (caja / equipo) */}
            <div className="p-md mb-md rounded-lg border border-outline-variant bg-surface-container-low">
              <p className="font-label-md text-label-md text-on-surface flex items-center gap-1 mb-1">
                <Icon name="inventory_2" size={16} className="text-on-surface-variant" />
                Componentes presentes
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-3">
                El código de barras identifica al conjunto (está en la tablet y en la caja).
                Marca lo que <b>físicamente existe</b>. Si falta el equipo, el estado físico se
                desactiva; los accesorios se marcan aparte.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Check
                  label="Caja"
                  checked={form.tiene_caja}
                  onChange={(v) => setField('tiene_caja', v)}
                />
                <Check
                  label={isTablet ? 'Equipo (la tablet)' : 'Equipo (el panel)'}
                  checked={form.tiene_equipo}
                  onChange={(v) => setField('tiene_equipo', v)}
                />
              </div>
              {!form.tiene_equipo && (
                <p className="font-body-sm text-body-sm text-error mt-2 flex items-center gap-1">
                  <Icon name="warning" size={14} filled />
                  Registrando el conjunto <b>sin el equipo</b>. Anota en Observaciones qué pasó
                  (p. ej. paradero desconocido).
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <Field label="Marca">
                <OptionSelect
                  className={inputCls}
                  options={MARCAS[form.tipo_bien]}
                  value={form.marca}
                  onChange={(v) => setField('marca', v)}
                  placeholder="Nueva marca…"
                />
              </Field>
              <Field label="Modelo">
                <OptionSelect
                  className={inputCls}
                  options={MODELOS[form.tipo_bien]}
                  value={form.modelo}
                  onChange={(v) => setField('modelo', v)}
                  placeholder="Nuevo modelo…"
                />
              </Field>
              <Field label="Estado físico">
                <select
                  className={`${inputCls} appearance-none ${!form.tiene_equipo ? 'opacity-50 cursor-not-allowed' : ''}`}
                  value={form.tiene_equipo ? form.estado_fisico : ''}
                  onChange={(e) => setField('estado_fisico', e.target.value)}
                  disabled={!form.tiene_equipo}
                >
                  {!form.tiene_equipo ? (
                    <option value="">No aplica: sin equipo</option>
                  ) : (
                    ESTADOS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))
                  )}
                </select>
              </Field>
              <Field label="Ubicación inicial *">
                <UbicacionSelect
                  className={inputCls}
                  value={form.ubicacion_actual}
                  onChange={(v) => setField('ubicacion_actual', v)}
                />
              </Field>
            </div>
          </div>

          {/* Accesorios dinámicos */}
          <div>
            <h3 className="font-title-md text-title-md text-primary mb-sm">Accesorios incluidos</h3>
            <div className="grid grid-cols-2 gap-y-2">
              {isTablet ? (
                <>
                  <Check label="Cargador" checked={form.accesorios.cargador} onChange={(v) => setAcc('cargador', v)} />
                  <Check label="Funda" checked={form.accesorios.funda} onChange={(v) => setAcc('funda', v)} />
                  <Check label="Pin SIM" checked={form.accesorios.pin_sim} onChange={(v) => setAcc('pin_sim', v)} />
                </>
              ) : (
                <>
                  <Check label="Tiene panel" checked={form.accesorios.tiene_panel} onChange={(v) => setAcc('tiene_panel', v)} />
                  <Check label="Cable de suministro" checked={form.accesorios.cable_suministro} onChange={(v) => setAcc('cable_suministro', v)} />
                </>
              )}
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <h3 className="font-title-md text-title-md text-primary mb-sm">Observaciones</h3>
            <textarea
              rows={3}
              className={inputCls}
              placeholder="Notas adicionales sobre el estado del activo…"
              value={form.observaciones}
              onChange={(e) => setField('observaciones', e.target.value)}
            />
          </div>

          {/* Mensajes */}
          {error && (
            <div className="flex items-start gap-xs bg-error-container text-on-error-container rounded-DEFAULT px-md py-sm font-body-sm text-body-sm">
              <Icon name="error" size={18} filled />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-xs bg-secondary-fixed text-on-secondary-fixed rounded-DEFAULT px-md py-sm font-body-sm text-body-sm">
              <Icon name="check_circle" size={18} filled />
              <span>{success}</span>
            </div>
          )}

          <hr className="border-outline-variant" />

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => navigate('/catalogo')}
              className="px-6 py-2 rounded-lg border border-outline font-label-md text-label-md text-on-surface hover:bg-surface-container-high transition-colors order-3 sm:order-1 disabled:opacity-60"
            >
              Cancelar
            </button>
            {!isEdit && (
              <button
                type="button"
                disabled={saving}
                onClick={() => save({ addAnother: true })}
                className="px-6 py-2 rounded-lg bg-surface-container-high font-label-md text-label-md text-on-surface hover:bg-surface-variant transition-colors order-2 disabled:opacity-60"
              >
                Guardar y añadir otro
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-secondary hover:bg-on-secondary-fixed-variant text-on-secondary font-label-md text-label-md transition-colors order-1 sm:order-3 shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving && <Icon name="progress_activity" size={18} className="animate-spin" />}
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar y finalizar'}
            </button>
          </div>
        </form>
      </div>

      <ScannerModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={(code) => setField('codigo_barras', code)}
      />
    </div>
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

function CategoryCard({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 border rounded-lg p-md text-center transition-all ${
        active
          ? 'border-secondary bg-secondary-fixed text-on-secondary-fixed'
          : 'border-outline-variant hover:bg-surface-container-low text-on-surface'
      }`}
    >
      <Icon name={icon} className="text-[32px] mb-2 block mx-auto" />
      <div className="font-label-md text-label-md">{label}</div>
    </button>
  )
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="text-secondary focus:ring-secondary rounded border-outline-variant"
      />
      <span className="font-body-md text-body-md text-on-surface">{label}</span>
    </label>
  )
}
