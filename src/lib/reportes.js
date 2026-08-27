import * as XLSX from 'xlsx'
import {
  TIPO_LABEL,
  ESTADO_LABEL,
  isComplete,
  missingAccessories,
  componenteFaltante,
  tieneEquipo,
} from './assets'

// --- Exportación a Excel (.xlsx) --------------------------------------------
// Mismo orden de columnas que el acta PDF, para consistencia.
function activosToRows(activos) {
  return activos.map((a, i) => ({
    '#': i + 1,
    'Código de barras': a.codigo_barras,
    Caja: a.numero_caja ?? '—',
    Tipo: TIPO_LABEL[a.tipo_bien] ?? a.tipo_bien,
    'Marca / Modelo': [a.marca, a.modelo].filter(Boolean).join(' ') || '—',
    Componentes: componenteFaltante(a) ?? 'Completo',
    'Estado físico': tieneEquipo(a) ? ESTADO_LABEL[a.estado_fisico] ?? a.estado_fisico : '—',
    Ubicación: a.ubicacion_actual,
    Verificación: a.verificado ? 'Verificado' : 'Pendiente',
    Accesorios: isComplete(a) ? 'Completo' : 'Faltan: ' + missingAccessories(a).join(', '),
    Registrado: a.created_at ? new Date(a.created_at).toLocaleString('es') : '',
  }))
}

// Construye la hoja de resumen (totales por tipo y por estado físico).
function buildResumenSheet(activos) {
  const total = activos.length
  const tablets = activos.filter((a) => a.tipo_bien === 'TABLET').length
  const paneles = activos.filter((a) => a.tipo_bien === 'PANEL_SOLAR').length

  const estados = ['POR_EVALUAR', 'BUENO', 'REGULAR', 'MALO', 'INOPERATIVO']
  const porEstado = estados.map((e) => [
    ESTADO_LABEL[e],
    activos.filter((a) => a.estado_fisico === e).length,
  ])

  const verificados = activos.filter((a) => a.verificado).length
  const completos = activos.filter((a) => isComplete(a)).length
  const sinEquipo = activos.filter((a) => a.tiene_equipo === false).length
  const sinCaja = activos.filter((a) => a.tiene_caja === false).length

  // Cantidad de activos por caja. Cada tipo lleva su propia numeración,
  // así que la clave es tipo + número (Caja 1 Tablet ≠ Caja 1 Panel).
  const cajasMap = {}
  activos.forEach((a) => {
    if (a.numero_caja != null) {
      const suf = a.tipo_bien === 'TABLET' ? 'Tablet' : 'Panel'
      const key = `${a.tipo_bien}#${a.numero_caja}`
      cajasMap[key] = cajasMap[key] || { tipo: a.tipo_bien, numero: a.numero_caja, suf, count: 0 }
      cajasMap[key].count += 1
    }
  })
  const porCaja = Object.values(cajasMap)
    .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.numero - b.numero)
    .map((c) => [`Caja ${c.numero} ${c.suf}`, c.count])

  const aoa = [
    ['RESUMEN DE INVENTARIO'],
    ['Generado', new Date().toLocaleString('es')],
    [],
    ['Totales por tipo', 'Cantidad'],
    ['Tablets PC', tablets],
    ['Paneles Solares', paneles],
    ['TOTAL', total],
    [],
    ['Cantidad por caja', 'Cantidad'],
    ...porCaja,
    [],
    ['Totales por estado físico', 'Cantidad'],
    ...porEstado,
    [],
    ['Integridad del conjunto', 'Cantidad'],
    ['Conjuntos sin equipo (falta tablet/panel)', sinEquipo],
    ['Conjuntos sin caja', sinCaja],
    [],
    ['Otros indicadores', 'Cantidad'],
    ['Verificados', verificados],
    ['Pendientes de verificar', total - verificados],
    ['Con accesorios completos', completos],
    ['Incompletos', total - completos],
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [{ wch: 28 }, { wch: 14 }]
  return ws
}

export function downloadXLSX(activos, filename = 'reporte-inventario.xlsx') {
  const rows = activosToRows(activos)
  const worksheet = XLSX.utils.json_to_sheet(rows)

  // Anchos de columna para que se lea ordenado.
  worksheet['!cols'] = [
    { wch: 5 }, // #
    { wch: 20 }, // Código de barras
    { wch: 8 }, // Caja
    { wch: 14 }, // Tipo
    { wch: 26 }, // Marca / Modelo
    { wch: 18 }, // Componentes
    { wch: 14 }, // Estado físico
    { wch: 22 }, // Ubicación
    { wch: 14 }, // Verificación
    { wch: 32 }, // Accesorios
    { wch: 20 }, // Registrado
  ]
  // Congela la fila de encabezados.
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1 }

  const workbook = XLSX.utils.book_new()
  // Hoja 1 (la que se abre): Inventario detallado, como el acta PDF.
  // Hoja 2: Resumen con los totales.
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario')
  XLSX.utils.book_append_sheet(workbook, buildResumenSheet(activos), 'Resumen')
  XLSX.writeFile(workbook, filename)
}

// --- Generación de Acta (documento imprimible / PDF vía navegador) ----------
export function generarActaInventario(activos, meta = {}) {
  const fecha = new Date().toLocaleString('es')
  const filas = activos
    .map(
      (a, i) => `
      <tr>
        <td>${i + 1}</td>
        <td class="mono">${escapeHtml(a.codigo_barras)}</td>
        <td>${a.numero_caja ?? '—'}</td>
        <td>${escapeHtml(TIPO_LABEL[a.tipo_bien] ?? a.tipo_bien)}</td>
        <td>${escapeHtml([a.marca, a.modelo].filter(Boolean).join(' ') || '—')}</td>
        <td>${escapeHtml(componenteFaltante(a) ?? 'Completo')}</td>
        <td>${escapeHtml(tieneEquipo(a) ? ESTADO_LABEL[a.estado_fisico] ?? a.estado_fisico : '—')}</td>
        <td>${escapeHtml(a.ubicacion_actual)}</td>
        <td>${a.verificado ? 'Verificado' : 'Pendiente'}</td>
        <td>${isComplete(a) ? 'Completo' : 'Faltan: ' + escapeHtml(missingAccessories(a).join(', '))}</td>
      </tr>`
    )
    .join('')

  const total = activos.length
  const verificados = activos.filter((a) => a.verificado).length
  const incompletos = activos.filter((a) => !isComplete(a)).length

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<title>Acta de Inventario</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; color: #1b1b1d; padding: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #45464d; font-size: 12px; margin-bottom: 16px; }
  .meta { display: flex; gap: 24px; flex-wrap: wrap; font-size: 12px; margin-bottom: 16px;
          border: 1px solid #c6c6cd; border-radius: 6px; padding: 12px 16px; }
  .meta b { display: block; color: #45464d; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #c6c6cd; padding: 6px 8px; text-align: left; }
  th { background: #f0edef; text-transform: uppercase; font-size: 10px; letter-spacing: .03em; }
  .mono { font-family: 'Roboto Mono', monospace; }
  .firmas { display: flex; justify-content: space-around; margin-top: 64px; }
  .firma { text-align: center; width: 40%; }
  .firma .linea { border-top: 1px solid #1b1b1d; margin-bottom: 6px; }
  .firma small { color: #45464d; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <h1>ACTA DE INVENTARIO Y AUDITORÍA</h1>
  <div class="sub">AssetTrack Pro · Generada el ${fecha}</div>
  <div class="meta">
    <div><b>Total de activos</b>${total}</div>
    <div><b>Verificados</b>${verificados}</div>
    <div><b>Incompletos</b>${incompletos}</div>
    <div><b>Filtro aplicado</b>${escapeHtml(meta.filtro || 'Todos los registros')}</div>
    <div><b>Responsable</b>${escapeHtml(meta.responsable || '____________________')}</div>
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>Cód. barras</th><th>Caja</th><th>Tipo</th>
      <th>Marca / Modelo</th><th>Componentes</th><th>Estado</th><th>Ubicación</th><th>Verificación</th><th>Accesorios</th>
    </tr></thead>
    <tbody>${filas || '<tr><td colspan="10" style="text-align:center;padding:24px;">Sin registros</td></tr>'}</tbody>
  </table>
  <div class="firmas">
    <div class="firma"><div class="linea"></div><small>Responsable de Auditoría</small></div>
    <div class="firma"><div class="linea"></div><small>Jefe de Almacén</small></div>
  </div>
  <script>window.onload = function () { window.print(); }</script>
</body></html>`

  const win = window.open('', '_blank')
  if (!win) return false
  win.document.open()
  win.document.write(html)
  win.document.close()
  return true
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
