/**
 * Juego de iconos de Mati Ventas: todos dibujados con el mismo trazo y la misma caja.
 * Ningún emoji ni glifo Unicode hace de icono en la interfaz (ver DESIGN.md).
 */

export type IconName =
  | 'carrito'
  | 'mas'
  | 'menos'
  | 'basurero'
  | 'listo'
  | 'reloj'
  | 'cerrar'
  | 'flecha'
  | 'candado'
  | 'persona'
  | 'salir'
  | 'subir'
  | 'bajar'
  | 'mover';

const PATHS: Record<IconName, React.ReactNode> = {
  carrito: (
    <>
      <path d="M2.5 3.5h2.2l2.1 10.2h9.1l2.1-7.3H6.2" />
      <circle cx="9" cy="19" r="1.6" />
      <circle cx="16.5" cy="19" r="1.6" />
    </>
  ),
  mas: <path d="M12 5.5v13M5.5 12h13" />,
  menos: <path d="M5.5 12h13" />,
  basurero: (
    <>
      <path d="M4 6.5h16M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
      <path d="M6.5 6.5 7.4 19a1.4 1.4 0 0 0 1.4 1.3h6.4a1.4 1.4 0 0 0 1.4-1.3l.9-12.5" />
      <path d="M10.5 10.5v6M13.5 10.5v6" />
    </>
  ),
  listo: <path d="M4.5 12.8 9.5 17.5 19.5 6.5" />,
  reloj: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.3l3.4 2" />
    </>
  ),
  cerrar: <path d="M6 6l12 12M18 6L6 18" />,
  flecha: <path d="M4.5 12h14m-5.5-5.5L18.5 12 13 17.5" />,
  candado: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
      <path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7" />
    </>
  ),
  persona: (
    <>
      <circle cx="12" cy="8.2" r="3.7" />
      <path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0" />
    </>
  ),
  subir: <path d="M12 19.5v-15m-6.5 6.5L12 4.5l6.5 6.5" />,
  bajar: <path d="M12 4.5v15m6.5-6.5L12 19.5l-6.5-6.5" />,
  // Asa de arrastre: dos filas de puntos, el gesto universal de "muéveme".
  mover: (
    <>
      <circle cx="9" cy="6" r="1.1" />
      <circle cx="15" cy="6" r="1.1" />
      <circle cx="9" cy="12" r="1.1" />
      <circle cx="15" cy="12" r="1.1" />
      <circle cx="9" cy="18" r="1.1" />
      <circle cx="15" cy="18" r="1.1" />
    </>
  ),
  salir: (
    <>
      <path d="M14.5 4.5h3.3a1.7 1.7 0 0 1 1.7 1.7v11.6a1.7 1.7 0 0 1-1.7 1.7h-3.3" />
      <path d="M10 8.5 6.5 12l3.5 3.5M6.5 12h8" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  /** Tamaño en píxeles; el trazo se mantiene óptico en todos. */
  size?: number;
  className?: string;
}

export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
