import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import Icon from './Icon'

// Formatos 1D habituales en etiquetas de equipos (MAC / S/N).
// Restringido a códigos de barra lineales para acelerar la detección.
const FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
]

// Recuadro de lectura: franja delgada y horizontal, para que solo entre
// UN código de barras a la vez (las tablets traen MAC y S/N muy juntos).
function qrboxStrip(vw, vh) {
  const width = Math.round(Math.min(vw * 0.9, 360)) || 250
  const height = Math.round(Math.min(vh * 0.2, 80)) || 70
  return { width, height }
}

/**
 * Escáner de cámara. Llama a `onDetected(codigo)` una sola vez por activación.
 * Cuando `active` es false, la cámara se detiene (p. ej. al mostrar el BottomSheet).
 */
export default function BarcodeScanner({ onDetected, active = true }) {
  const containerId = useRef(`reader-${Math.random().toString(36).slice(2)}`).current
  const scannerRef = useRef(null)
  const onDetectedRef = useRef(onDetected)
  const lockRef = useRef(false)
  const [error, setError] = useState('')

  // Mantener la última callback sin reiniciar la cámara.
  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    if (!active) return

    let cancelled = false
    lockRef.current = false
    setError('')
    const scanner = new Html5Qrcode(containerId, { formatsToSupport: FORMATS, verbose: false })
    scannerRef.current = scanner

    // Guardamos la promesa de arranque: la cámara se inicia de forma asíncrona,
    // así que el cleanup debe esperar a que termine antes de detenerla. Si no,
    // el `start()` sigue en marcha después de desmontar y deja un <video>
    // huérfano; al remontar (p. ej. StrictMode) se apila otro → imagen doble.
    const startPromise = scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: qrboxStrip },
        (decodedText) => {
          if (lockRef.current) return
          lockRef.current = true
          onDetectedRef.current?.(decodedText)
        },
        () => {} // ignorar errores por frame (no hay código en vista)
      )
      .catch((err) => {
        if (cancelled) return
        setError(
          err?.message?.includes('Permission')
            ? 'Permiso de cámara denegado. Habilítalo en el navegador.'
            : 'No se pudo iniciar la cámara. Usa la búsqueda manual.'
        )
      })

    return () => {
      cancelled = true
      startPromise.finally(() => {
        const stop =
          scanner.getState && scanner.getState() === 2 /* SCANNING */
            ? scanner.stop()
            : Promise.resolve()
        stop
          .catch(() => {})
          .finally(() => {
            try {
              scanner.clear()
            } catch {
              /* noop */
            }
            // Red de seguridad: eliminar cualquier <video>/<canvas> residual
            // que la librería haya inyectado en el contenedor.
            const el = document.getElementById(containerId)
            if (el) el.innerHTML = ''
          })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  return (
    <div className="w-full">
      <div
        id={containerId}
        className="w-full min-h-[220px] bg-black rounded-lg overflow-hidden flex items-center justify-center [&_video]:w-full [&_video]:block [&_video]:rounded-lg"
      />
      <p className="mt-xs text-center font-body-sm text-[12px] text-on-surface-variant">
        Alinea un solo código dentro de la franja.
      </p>
      {error && (
        <div className="mt-sm flex items-start gap-xs bg-error-container text-on-error-container rounded-DEFAULT px-md py-sm font-body-sm text-body-sm">
          <Icon name="videocam_off" size={18} filled />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
