import React from 'react'

/**
 * Ícone de moto para pedidos de delivery — SVG inline (sem emoji).
 * Uso: <IconeMoto size={16} /> — herda a cor do texto via currentColor.
 */
export default function IconeMoto({ size = 18, style }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', ...style }}
      aria-hidden="true"
    >
      {/* rodas */}
      <circle cx="5.5" cy="16.5" r="3.3" />
      <circle cx="18.5" cy="16.5" r="3.3" />
      {/* chassi: roda traseira → banco → tanque */}
      <path d="M5.5 16.5 9.2 11.2h4.2l2.1 5.3" />
      {/* banco traseiro */}
      <path d="M9.2 11.2 7.8 8.6H5.4" />
      {/* guidão */}
      <path d="M13.4 11.2 15 7.2h3.1" />
      {/* forquilha até a roda dianteira */}
      <path d="M16.6 7.2 18.5 16.5" />
    </svg>
  )
}
