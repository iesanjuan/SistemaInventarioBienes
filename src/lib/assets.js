// Helpers de dominio para activos y accesorios.

export const TIPO_LABEL = {
  TABLET: 'Tablet PC',
  PANEL_SOLAR: 'Panel Solar',
}

export const TIPO_ICON = {
  TABLET: 'tablet_mac',
  PANEL_SOLAR: 'solar_power',
}

export const ESTADO_LABEL = {
  POR_EVALUAR: 'Por evaluar',
  BUENO: 'Bueno',
  REGULAR: 'Regular',
  MALO: 'Malo',
  INOPERATIVO: 'Inoperativo',
}

// Clases del badge de estado físico según la línea gráfica de UI/UI.html.
export function estadoBadgeClasses(estado) {
  switch (estado) {
    case 'BUENO':
      return 'bg-secondary-fixed-dim text-secondary-container'
    case 'REGULAR':
      return 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant'
    case 'MALO':
    case 'INOPERATIVO':
      return 'bg-error-container text-on-error-container'
    case 'POR_EVALUAR':
      return 'bg-surface-variant text-on-surface-variant border border-outline-variant'
    default:
      return 'bg-surface-variant text-on-surface-variant'
  }
}

// Accesorios esperados por tipo de bien (según Tarea 2.3).
// TABLET  -> cargador, funda, pin_sim
// PANEL   -> tiene_panel, cable_suministro
export function expectedAccessories(tipo) {
  return tipo === 'TABLET'
    ? ['cargador', 'funda', 'pin_sim']
    : ['tiene_panel', 'cable_suministro']
}

// ¿Están completos todos los accesorios esperados?
export function isComplete(activo) {
  const acc = activo?.accesorios_activos
  // Supabase puede devolver la relación como objeto (1:1) o como array.
  const row = Array.isArray(acc) ? acc[0] : acc
  if (!row) return false
  return expectedAccessories(activo.tipo_bien).every((key) => row[key] === true)
}

// Etiquetas legibles de cada accesorio.
export const ACC_LABEL = {
  cargador: 'Cargador',
  funda: 'Funda',
  pin_sim: 'Pin SIM',
  cable_suministro: 'Cable de suministro',
  tiene_panel: 'Panel',
}

// Devuelve la fila de accesorios normalizada (Supabase la da como objeto o array).
export function accessoryRow(activo) {
  const acc = activo?.accesorios_activos
  return Array.isArray(acc) ? acc[0] ?? null : acc ?? null
}

export function missingAccessories(activo) {
  const acc = activo?.accesorios_activos
  const row = Array.isArray(acc) ? acc[0] : acc
  if (!row) return expectedAccessories(activo.tipo_bien).map((k) => ACC_LABEL[k])
  return expectedAccessories(activo.tipo_bien)
    .filter((key) => row[key] !== true)
    .map((k) => ACC_LABEL[k])
}
