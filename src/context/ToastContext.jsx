import { createContext, useCallback, useContext, useRef, useState } from 'react'
import Icon from '../components/Icon'

// Sistema global de notificaciones tipo "toast". Se monta una sola vez (encima
// del router) para que las notificaciones sobrevivan a los cambios de página,
// p. ej. al guardar un activo y navegar de vuelta al catálogo.
const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}

let idSeq = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }, [])

  const show = useCallback(
    (message, { type = 'success', duration = 4000 } = {}) => {
      if (!message) return null
      const id = ++idSeq
      setToasts((list) => [...list, { id, message, type }])
      if (duration > 0) {
        timers.current[id] = setTimeout(() => dismiss(id), duration)
      }
      return id
    },
    [dismiss]
  )

  const api = {
    show,
    success: (msg, opts) => show(msg, { ...opts, type: 'success' }),
    error: (msg, opts) => show(msg, { duration: 6000, ...opts, type: 'error' }),
    info: (msg, opts) => show(msg, { ...opts, type: 'info' }),
    dismiss,
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

const STYLES = {
  success: { cls: 'bg-secondary-fixed text-on-secondary-fixed', icon: 'check_circle' },
  error: { cls: 'bg-error-container text-on-error-container', icon: 'error' },
  info: { cls: 'bg-surface-container-high text-on-surface', icon: 'info' },
}

function ToastViewport({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col items-end gap-2 w-[min(92vw,380px)] pointer-events-none">
      {toasts.map((t) => {
        const s = STYLES[t.type] ?? STYLES.info
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-xs rounded-DEFAULT px-md py-sm shadow-lg font-body-sm text-body-sm animate-[toast-in_.2s_ease-out] ${s.cls}`}
          >
            <Icon name={s.icon} size={18} filled />
            <span className="flex-1 break-words">{t.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Cerrar notificación"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
