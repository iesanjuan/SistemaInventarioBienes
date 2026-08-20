import { lazy, Suspense } from 'react'
import Icon from './Icon'

// Carga diferida: html5-qrcode solo se descarga al abrir el escáner.
const BarcodeScanner = lazy(() => import('./BarcodeScanner'))

export default function ScannerModal({ open, onClose, onDetected, title = 'Escanear código de barras' }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-md">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-md py-3 border-b border-outline-variant">
          <h3 className="font-title-md text-title-md text-primary flex items-center gap-2">
            <Icon name="barcode_scanner" size={20} />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:bg-surface-container-high rounded-DEFAULT"
            aria-label="Cerrar"
          >
            <Icon name="close" size={22} />
          </button>
        </div>
        <div className="p-md">
          <Suspense
            fallback={
              <div className="w-full aspect-[4/3] bg-surface-container rounded-lg flex items-center justify-center gap-sm text-on-surface-variant">
                <Icon name="progress_activity" size={28} className="animate-spin text-secondary" />
                Iniciando cámara…
              </div>
            }
          >
            <BarcodeScanner
              active={open}
              onDetected={(code) => {
                onDetected(code)
                onClose()
              }}
            />
          </Suspense>
          <p className="mt-sm font-body-sm text-body-sm text-on-surface-variant text-center">
            Apunta la cámara al código de barras del activo.
          </p>
        </div>
      </div>
    </div>
  )
}
