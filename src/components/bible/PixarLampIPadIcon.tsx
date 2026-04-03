import React from "react";

interface Props extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * Custom icon: iPad with Apple Pencil – gateway to Study Mode.
 */
export function PixarLampIPadIcon({ size = 24, ...props }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      {...props}
    >
      <defs>
        <linearGradient id="chassis" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="screen" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="pencil" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="80%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="glare" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      <rect x="80" y="66" width="340" height="400" rx="36" fill="rgba(0,0,0,0.15)" filter="blur(12px)" />
      <rect x="80" y="56" width="340" height="400" rx="36" fill="url(#chassis)" />
      <rect x="96" y="72" width="308" height="368" rx="20" fill="url(#screen)" />
      <path d="M 96 72 L 404 380 L 404 72 Z" fill="url(#glare)" />
      <circle cx="250" cy="64" r="4" fill="#020617" />
      <circle cx="250" cy="64" r="1.5" fill="#334155" />
      <rect x="424" y="136" width="16" height="260" rx="8" fill="rgba(0,0,0,0.2)" filter="blur(4px)" />
      <g transform="translate(424, 126)">
        <rect x="0" y="0" width="16" height="260" rx="8" fill="url(#pencil)" />
        <line x1="0" y1="30" x2="16" y2="30" stroke="#cbd5e1" strokeWidth="2" />
        <path d="M 3 260 L 8 274 L 13 260 Z" fill="#e2e8f0" />
      </g>
    </svg>
  );
}
