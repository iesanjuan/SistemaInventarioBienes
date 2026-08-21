// Selector de ubicación con las opciones reales del colegio:
//  - Almacén General: donde ingresan/permanecen todos los bienes.
//  - AIP: Aula de Innovación Pedagógica.
//  - Salón: se especifica el número o nombre del salón de destino.
//
// El valor guardado (string) es directamente lo que se almacena en
// `activos.ubicacion_actual` / `asignaciones.area_aula`, p. ej.
// "Almacén General", "AIP" o "Salón 12".

export const UBICACION_ALMACEN = 'Almacén General'

const OPCIONES = [
  { value: UBICACION_ALMACEN, label: 'Almacén General' },
  { value: 'AIP', label: 'AIP (Aula de Innovación)' },
  { value: 'Salón', label: 'Salón…' },
]

function esSalon(value) {
  return typeof value === 'string' && value.startsWith('Salón')
}

export default function UbicacionSelect({ value, onChange, disabled = false, className = '' }) {
  const salonSel = esSalon(value)
  const selected = salonSel ? 'Salón' : value || ''
  const salonNum = salonSel ? value.replace(/^Salón\s*/, '') : ''

  function handleSelect(opt) {
    if (opt === 'Salón') {
      onChange(salonNum ? `Salón ${salonNum}` : 'Salón')
    } else {
      onChange(opt)
    }
  }

  function handleSalon(num) {
    const n = num.trim()
    onChange(n ? `Salón ${n}` : 'Salón')
  }

  return (
    <div className="flex gap-2">
      <select
        className={`${className} appearance-none flex-1`}
        value={selected}
        onChange={(e) => handleSelect(e.target.value)}
        disabled={disabled}
      >
        <option value="">Selecciona ubicación…</option>
        {OPCIONES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {selected === 'Salón' && (
        <input
          type="text"
          className={`${className} w-32`}
          placeholder="N.º o nombre"
          value={salonNum}
          onChange={(e) => handleSalon(e.target.value)}
          disabled={disabled}
        />
      )}
    </div>
  )
}
