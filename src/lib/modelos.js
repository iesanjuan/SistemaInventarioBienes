// Marcas y modelos frecuentes por tipo de bien.
// Como en el colegio suelen ser siempre los mismos, se ofrecen en un
// desplegable. Para agregar/quitar opciones, edita estas listas; el
// usuario también puede elegir "Otro…" y escribir uno nuevo al registrar.

export const MARCAS = {
  TABLET: ['Alldocube'],
  PANEL_SOLAR: ['Allpowers'],
}

export const MODELOS = {
  TABLET: ['T1021P'],
  PANEL_SOLAR: ['AP-5V30W'],
}

// Valor por defecto: si hay una sola opción en la lista, se preselecciona.
export function defaultMarca(tipo) {
  const list = MARCAS[tipo] ?? []
  return list.length === 1 ? list[0] : ''
}
export function defaultModelo(tipo) {
  const list = MODELOS[tipo] ?? []
  return list.length === 1 ? list[0] : ''
}
