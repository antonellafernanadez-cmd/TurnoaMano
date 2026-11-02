// Logo de Mi Turno a Mano: dos personas y un corazón con una cruz. Es decorativo (aria-hidden).
export default function Logo({ tamano = 150 }) {
  return (
    <svg viewBox="0 0 200 190" width={tamano} height={tamano * 0.95} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="gradCorazon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#0b3fa8" />
        </linearGradient>
      </defs>
      <circle cx="62" cy="26" r="17" fill="#0b6fd6" />
      <circle cx="138" cy="26" r="17" fill="#2cc4b5" />
      <g transform="translate(0 28) scale(1 .95)">
        <path
          d="M100 170 C40 130 10 95 10 65 C10 35 35 15 60 15 C78 15 92 25 100 40 C108 25 122 15 140 15 C165 15 190 35 190 65 C190 95 160 130 100 170 Z"
          fill="url(#gradCorazon)"
        />
        <rect x="88" y="55" width="24" height="70" rx="8" fill="#fff" />
        <rect x="65" y="78" width="70" height="24" rx="8" fill="#fff" />
      </g>
    </svg>
  );
}
