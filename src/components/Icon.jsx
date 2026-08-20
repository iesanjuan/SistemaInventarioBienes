// Wrapper de Material Symbols Outlined (mismo sistema de iconos que UI/UI.html).
export default function Icon({ name, filled = false, className = '', style, size }) {
  const sizeStyle = size ? { fontSize: `${size}px` } : undefined
  return (
    <span
      className={`material-symbols-outlined${filled ? ' filled' : ''} ${className}`}
      style={{ ...sizeStyle, ...style }}
    >
      {name}
    </span>
  )
}
