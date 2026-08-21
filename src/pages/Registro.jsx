import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import ScannerModal from '../components/ScannerModal'
import UbicacionSelect, { UBICACION_ALMACEN } from '../components/UbicacionSelect'
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
    codigo_patrimonial: '',
    marca: '',
    modelo: '',
    estado_fisico: 'POR_EVALUAR',
    solo_caja: false,
    ubicacion_actual: UBICACION_ALMACEN,
    observaciones: '',
    accesorios: { ...EMPTY_ACC },
  }
}

export default function Registro() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [scanOpen, setScanOpen] = useState(false)

  const isTablet = form.tipo_bien === 'TABLET'

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
  }
  function setAcc(name, value) {
    setForm((f) => ({ ...f, accesorios: { ...f.accesorios, [name]: value } }))
  }

  function setTipo(tipo) {
    // Al cambiar de categoría, reseteamos los accesorios (aplican distintos por tipo).
    setForm((f) => ({ ...f, tipo_bien: tipo, accesorios: { ...EMPTY_ACC } }))
  }

  async function save({ addAnother }) {
    setError('')
    setSuccess('')

    if (!form.codigo_barras.trim()) {
      setError('El código de barras es obligatorio.')
      return
    }
    // La ubicación siempre es obligatoria: aun siendo solo la caja,
    // esta se encuentra físicamente en algún lugar (p. ej. el almacén).
    if (!form.ubicacion_actual.trim()) {
      setError('La ubicación es obligatoria.')
      return
    }

    setSaving(true)

    // 1) Insertar el activo y recuperar su id
    const { data: activo, error: activoError } = await supabase
      .from('activos')
      .insert({
        codigo_barras: form.codigo_barras.trim(),
        codigo_patrimonial: isTablet ? form.codigo_patrimonial.trim() || null : null,
        tipo_bien: form.tipo_bien,
        // Si solo se tiene la caja: sin marca/modelo, sin equipo -> INOPERATIVO.
        marca: form.solo_caja ? null : form.marca.trim() || null,
        modelo: form.solo_caja ? null : form.modelo.trim() || null,
        estado_fisico: form.solo_caja ? 'INOPERATIVO' : form.estado_fisico,
        solo_caja: form.solo_caja,
        ubicacion_actual: form.ubicacion_actual.trim(),
        observaciones: form.observaciones.trim() || null,
      })
      .select()
      .single()

    if (activoError) {
      setSaving(false)
      if (activoError.code === '23505') {
        setError('Ya existe un activo con ese código de barras.')
      } else {
        setError(activoError.message)
      }
      return
    }

    // 2) Insertar los accesorios usando el activo_id devuelto.
    //    Si solo es la caja, no hay accesorios (todos en false).
    const acc = form.solo_caja
      ? {}
      : isTablet
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
      .insert({ activo_id: activo.id, ...acc })

    setSaving(false)

    if (accError) {
      // El activo quedó creado; avisamos que faltó el registro de accesorios.
      setError(`Activo creado, pero falló el registro de accesorios: ${accError.message}`)
      return
    }

    if (addAnother) {
      setForm(emptyForm())
      setSuccess(`Activo ${activo.codigo_barras} registrado. Puedes añadir otro.`)
    } else {
      navigate('/catalogo')
    }
  }

  return (
    <div className="p-md md:p-lg">
      {/* Header */}
      <div className="mb-lg">
        <h2 className="font-display-lg text-display-lg text-primary">Registro de Activos</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Da de alta nuevos activos físicos en el sistema de seguimiento.
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

              {/* Código patrimonial: solo TABLET */}
              {isTablet && (
                <Field label="Código patrimonial">
                  <input
                    className={inputCls}
                    placeholder="Ingresa el código"
                    value={form.codigo_patrimonial}
                    onChange={(e) => setField('codigo_patrimonial', e.target.value)}
                  />
                </Field>
              )}
            </div>
          </div>

          {/* Especificaciones */}
          <div>
            <h3 className="font-title-md text-title-md text-primary mb-md">Especificaciones</h3>

            {/* Solo la caja / empaque (sin equipo físico) */}
            <label className="flex items-start gap-3 p-md mb-md rounded-lg border border-outline-variant bg-surface-container-low cursor-pointer">
              <input
                type="checkbox"
                checked={form.solo_caja}
                onChange={(e) => setField('solo_caja', e.target.checked)}
                className="mt-0.5 w-4 h-4 text-secondary focus:ring-secondary rounded border-outline-variant"
              />
              <span>
                <span className="font-label-md text-label-md text-on-surface flex items-center gap-1">
                  <Icon name="inventory_2" size={16} className="text-on-surface-variant" />
                  Solo la caja / empaque (sin equipo físico)
                </span>
                <span className="block font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Al marcar se bloquean marca, modelo, estado físico y accesorios (no existe el
                  equipo). La ubicación sigue habilitada porque la caja está físicamente en algún lugar.
                </span>
              </span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <Field label="Marca">
                <input
                  className={`${inputCls} ${form.solo_caja ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="Ej. Samsung, Jinko…"
                  value={form.solo_caja ? '' : form.marca}
                  onChange={(e) => setField('marca', e.target.value)}
                  disabled={form.solo_caja}
                />
              </Field>
              <Field label="Modelo">
                <input
                  className={`${inputCls} ${form.solo_caja ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="Ej. Galaxy Tab A8"
                  value={form.solo_caja ? '' : form.modelo}
                  onChange={(e) => setField('modelo', e.target.value)}
                  disabled={form.solo_caja}
                />
              </Field>
              <Field label="Estado físico">
                <select
                  className={`${inputCls} appearance-none ${form.solo_caja ? 'opacity-50 cursor-not-allowed' : ''}`}
                  value={form.solo_caja ? '' : form.estado_fisico}
                  onChange={(e) => setField('estado_fisico', e.target.value)}
                  disabled={form.solo_caja}
                >
                  {form.solo_caja ? (
                    <option value="">No aplica (solo caja)</option>
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
            {form.solo_caja ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                No aplica: solo se registra la caja.
              </p>
            ) : (
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
            )}
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
            <button
              type="button"
              disabled={saving}
              onClick={() => save({ addAnother: true })}
              className="px-6 py-2 rounded-lg bg-surface-container-high font-label-md text-label-md text-on-surface hover:bg-surface-variant transition-colors order-2 disabled:opacity-60"
            >
              Guardar y añadir otro
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-secondary hover:bg-on-secondary-fixed-variant text-on-secondary font-label-md text-label-md transition-colors order-1 sm:order-3 shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving && <Icon name="progress_activity" size={18} className="animate-spin" />}
              {saving ? 'Guardando…' : 'Guardar y finalizar'}
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
