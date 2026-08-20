import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import BarcodeScanner from '../components/BarcodeScanner'
import { supabase } from '../lib/supabaseClient'
import {
  TIPO_LABEL,
  TIPO_ICON,
  ESTADO_LABEL,
  estadoBadgeClasses,
  isComplete,
  missingAccessories,
} from '../lib/assets'

export default function Auditoria() {
  const navigate = useNavigate()
  const [manual, setManual] = useState('')
  const [scanning, setScanning] = useState(true)
  const [looking, setLooking] = useState(false)
  // result: { found: boolean, asset?, code }
  const [result, setResult] = useState(null)

  async function lookup(code) {
    const codigo = String(code).trim()
    if (!codigo) return
    setScanning(false)
    setLooking(true)

    const { data, error } = await supabase
      .from('activos')
      .select('*, accesorios_activos(*)')
      .eq('codigo_barras', codigo)
      .single()

    setLooking(false)

    if (error || !data) {
      // PGRST116 = no rows
      setResult({ found: false, code: codigo })
    } else {
      setResult({ found: true, asset: data, code: codigo })
    }
  }

  function closeSheet() {
    setResult(null)
    setManual('')
    setScanning(true)
  }

  return (
    <div className="p-md md:p-lg max-w-xl mx-auto flex flex-col gap-lg">
      {/* Header */}
      <div>
        <h2 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-primary">
          Auditoría Móvil
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Escanea el código de barras del activo para consultarlo y conciliarlo.
        </p>
      </div>

      {/* Escáner */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md shadow-sm">
        {scanning ? (
          <BarcodeScanner active={scanning} onDetected={lookup} />
        ) : (
          <div className="w-full aspect-[4/3] bg-surface-container rounded-lg flex flex-col items-center justify-center gap-sm text-on-surface-variant">
            {looking ? (
              <>
                <Icon name="progress_activity" size={32} className="animate-spin text-secondary" />
                <p className="font-body-sm text-body-sm">Buscando activo…</p>
              </>
            ) : (
              <button
                onClick={() => {
                  setResult(null)
                  setScanning(true)
                }}
                className="flex flex-col items-center gap-sm text-secondary"
              >
                <Icon name="barcode_scanner" size={40} />
                <span className="font-label-md text-label-md">Reanudar escaneo</span>
              </button>
            )}
          </div>
        )}

        {/* Búsqueda manual */}
        <form
          className="mt-md flex gap-sm"
          onSubmit={(e) => {
            e.preventDefault()
            lookup(manual)
          }}
        >
          <div className="relative flex-1">
            <Icon
              name="qr_code_scanner"
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Ingresar código manualmente…"
              className="w-full pl-10 pr-4 py-sm bg-surface border border-outline-variant rounded-DEFAULT focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none font-body-sm text-body-sm text-on-surface"
            />
          </div>
          <button
            type="submit"
            className="bg-secondary text-on-secondary px-md rounded-DEFAULT font-label-md text-label-md hover:opacity-90 transition-opacity"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* BottomSheet resultado */}
      {result && (
        <BottomSheet onClose={closeSheet}>
          {result.found ? (
            <FoundSheet
              asset={result.asset}
              onConciliar={() => navigate(`/conciliacion/${result.asset.id}`)}
              onClose={closeSheet}
            />
          ) : (
            <NotFoundSheet code={result.code} onClose={closeSheet} onRegister={() => navigate('/registro')} />
          )}
        </BottomSheet>
      )}
    </div>
  )
}

function BottomSheet({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-xl bg-surface-container-lowest rounded-t-xl border-t border-x border-outline-variant shadow-xl p-lg animate-[slideup_0.2s_ease-out] max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 bg-outline-variant rounded-full mx-auto mb-md" />
        {children}
      </div>
    </div>
  )
}

function FoundSheet({ asset, onConciliar, onClose }) {
  const complete = isComplete(asset)
  const missing = missingAccessories(asset)

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-start gap-md">
        <div className="w-14 h-14 rounded-lg bg-surface-container flex items-center justify-center border border-outline-variant shrink-0">
          <Icon
            name={TIPO_ICON[asset.tipo_bien]}
            className={asset.tipo_bien === 'TABLET' ? 'text-secondary' : 'text-tertiary-container'}
          />
        </div>
        <div className="flex-1">
          <p className="font-code-sm text-code-sm font-bold text-primary">{asset.codigo_barras}</p>
          <p className="font-body-md text-body-md text-primary font-semibold">
            {TIPO_LABEL[asset.tipo_bien]} · {[asset.marca, asset.modelo].filter(Boolean).join(' ') || '—'}
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{asset.ubicacion_actual}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-sm">
        <InfoBox label="Estado físico">
          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${estadoBadgeClasses(asset.estado_fisico)}`}>
            {ESTADO_LABEL[asset.estado_fisico] ?? asset.estado_fisico}
          </span>
        </InfoBox>
        <InfoBox label="Accesorios">
          {complete ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary-container">
              <Icon name="check_circle" size={14} filled /> Completo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-error">
              <Icon name="error" size={14} filled /> Faltan: {missing.join(', ')}
            </span>
          )}
        </InfoBox>
        <InfoBox label="Cód. patrimonial">
          <span className="font-code-sm text-code-sm text-on-surface">{asset.codigo_patrimonial || '—'}</span>
        </InfoBox>
        <InfoBox label="Verificado">
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${asset.verificado ? 'text-secondary' : 'text-outline'}`}>
            <Icon name={asset.verificado ? 'verified' : 'pending'} size={14} />
            {asset.verificado ? 'Sí' : 'Pendiente'}
          </span>
        </InfoBox>
      </div>

      <div className="flex gap-sm mt-sm">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-outline text-on-surface rounded-DEFAULT font-label-md text-label-md hover:bg-surface-container-high transition-colors"
        >
          Cerrar
        </button>
        <button
          onClick={onConciliar}
          className="flex-1 px-4 py-2 bg-secondary text-on-secondary rounded-DEFAULT font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <Icon name="compare" size={18} />
          Conciliar
        </button>
      </div>
    </div>
  )
}

function NotFoundSheet({ code, onClose, onRegister }) {
  return (
    <div className="flex flex-col items-center text-center gap-sm py-md">
      <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center">
        <Icon name="search_off" className="text-on-error-container" />
      </div>
      <p className="font-title-md text-title-md text-primary">Activo no encontrado</p>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        No existe ningún activo con el código{' '}
        <span className="font-code-sm text-on-surface">{code}</span>.
      </p>
      <div className="flex gap-sm mt-sm w-full">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-outline text-on-surface rounded-DEFAULT font-label-md text-label-md hover:bg-surface-container-high transition-colors"
        >
          Reintentar
        </button>
        <button
          onClick={onRegister}
          className="flex-1 px-4 py-2 bg-secondary text-on-secondary rounded-DEFAULT font-label-md text-label-md hover:opacity-90 transition-opacity"
        >
          Registrar nuevo
        </button>
      </div>
    </div>
  )
}

function InfoBox({ label, children }) {
  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-DEFAULT p-sm">
      <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  )
}
