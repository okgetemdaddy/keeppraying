import React from "react";

interface Props extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

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
        <linearGradient id="screenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="40%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="pencilShad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>

      <g transform="translate(256, 320) scale(1, 0.577) rotate(45)">
        <rect x="-150" y="-210" width="300" height="420" rx="24" fill="#020617" opacity="0.6" filter="blur(16px)" />
      </g>

      <g transform="translate(256, 290) scale(1, 0.577) rotate(45)">
        <rect x="-160" y="-220" width="320" height="440" rx="24" fill="#334155" />
      </g>

      <g transform="translate(256, 280) scale(1, 0.577) rotate(45)">
        <rect x="-160" y="-220" width="320" height="440" rx="24" fill="#0f172a" />
        <rect x="-144" y="-204" width="288" height="408" rx="12" fill="url(#screenGrad)" />
        <rect x="-120" y="-180" width="240" height="40" rx="6" fill="#1e293b" opacity="0.5" />
        <rect x="-120" y="-120" width="110" height="100" rx="6" fill="#1e293b" opacity="0.5" />
        <rect x="10" y="-120" width="110" height="100" rx="6" fill="#1e293b" opacity="0.5" />
      </g>

      <polygon points="256,280 390,320 405,310" fill="#020617" opacity="0.5" filter="blur(6px)" />

      <g transform="translate(256, 280) scale(1, 0.577)">
        <circle cx="0" cy="0" r="45" fill="none" stroke="#475569" strokeWidth="2" opacity="0.7" />
        <circle cx="0" cy="0" r="22" fill="none" stroke="#f8fafc" strokeWidth="3" />
        <circle cx="0" cy="0" r="6" fill="#ffffff" />
      </g>

      <g transform="translate(256, 280) rotate(38)">
        <polygon points="0,0 -9,-26 9,-26" fill="#cbd5e1" />
        <path d="M -9 -26 L -9 -230 Q 0 -245 9 -230 L 9 -26 Z" fill="url(#pencilShad)" />
        <line x1="-9" y1="-195" x2="9" y2="-195" stroke="#94a3b8" strokeWidth="2" />
      </g>
    </svg>
  );
}
