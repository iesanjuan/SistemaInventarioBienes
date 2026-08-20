import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import Icon from './Icon'

// Formatos habituales de códigos de barras 1D + QR.
const FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
]

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

    lockRef.current = false
    setError('')
    const scanner = new Html5Qrcode(containerId, { formatsToSupport: FORMATS, verbose: false })
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          if (lockRef.current) return
          lockRef.current = true
          onDetectedRef.current?.(decodedText)
        },
        () => {} // ignorar errores por frame (no hay código en vista)
      )
      .catch((err) => {
        setError(
          err?.message?.includes('Permission')
            ? 'Permiso de cámara denegado. Habilítalo en el navegador.'
            : 'No se pudo iniciar la cámara. Usa la búsqueda manual.'
        )
      })

    return () => {
      const s = scannerRef.current
      if (s && s.getState && s.getState() === 2 /* SCANNING */) {
        s.stop().then(() => s.clear()).catch(() => {})
      } else if (s) {
        try {
          s.clear()
        } catch {
          /* noop */
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  return (
    <div className="w-full">
      <div
        id={containerId}
        className="w-full aspect-[4/3] bg-black rounded-lg overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
      />
      {error && (
        <div className="mt-sm flex items-start gap-xs bg-error-container text-on-error-container rounded-DEFAULT px-md py-sm font-body-sm text-body-sm">
          <Icon name="videocam_off" size={18} filled />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
