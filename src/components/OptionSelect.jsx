import { useEffect, useState } from 'react'

// Desplegable con una lista de opciones frecuentes + "Otro…" para escribir
// un valor nuevo en el momento (p. ej. una marca o modelo que aún no está
// en la lista). El valor emitido por onChange es siempre el texto final.
const OTRO = '__OTRO__'

export default function OptionSelect({
  options = [],
  value = '',
  onChange,
  disabled = false,
  className = '',
  placeholder = 'Escribe el valor…',
}) {
  const isKnown = value !== '' && options.includes(value)
  const [otro, setOtro] = useState(value !== '' && !isKnown)

  // Si el valor llega desde fuera y no está en la lista, activa modo "Otro".
  useEffect(() => {
    if (value !== '' && !options.includes(value)) setOtro(true)
    if (value === '') setOtro(false)
  }, [value, options])

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
        <option value="">Selecciona…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        <option value={OTRO}>Otro…</option>
      </select>
      {otro && (
        <input
          type="text"
          className={`${className} flex-1`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}
    </div>
  )
}
