import { useEffect, useState } from 'react'

// Selector de ubicación. Opciones frecuentes del colegio + "Otro…" para
// escribir cualquier otro lugar, ya que las tablets pueden estar repartidas
// en sitios distintos.
//
// El valor guardado (string) es directamente lo que se almacena en
// `activos.ubicacion_actual` / `asignaciones.area_aula`, p. ej.
// "Almacén General", "AIP" o cualquier texto escrito en "Otro…".

export const UBICACION_ALMACEN = 'Almacén General'

const OPCIONES = [
  { value: UBICACION_ALMACEN, label: 'Almacén General' },
  { value: 'AIP', label: 'AIP (Aula de Innovación)' },
]

const OTRO = '__OTRO__'

function esConocida(value) {
  return OPCIONES.some((o) => o.value === value)
}

export default function UbicacionSelect({ value, onChange, disabled = false, className = '' }) {
  const isKnown = value !== '' && esConocida(value)
  const [otro, setOtro] = useState(value !== '' && !isKnown)

  // Si el valor llega desde fuera y no es una opción conocida, activa "Otro".
  useEffect(() => {
    if (value !== '' && !esConocida(value)) setOtro(true)
    if (value === '') setOtro(false)
  }, [value])

  const selectValue = otro ? OTRO : isKnown ? value : ''

  function handleSelect(v) {
    if (v === OTRO) {
      setOtro(true)
      onChange('')
    } else {
      setOtro(false)
      onChange(v)
    }
  }

  return (
    <div className="flex gap-2">
      <select
        className={`${className} appearance-none flex-1`}
        value={selectValue}
        onChange={(e) => handleSelect(e.target.value)}
        disabled={disabled}
      >
        <option value="">Selecciona ubicación…</option>
        {OPCIONES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value={OTRO}>Otro…</option>
      </select>
      {otro && (
        <input
          type="text"
          className={`${className} flex-1`}
          placeholder="Escribe la ubicación…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}
    </div>
  )
}
