import React from "react";

interface Props extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * Custom icon: Pixar-style desk lamp next to an iPad.
 */
export function PixarLampIPadIcon({ size = 24, ...props }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Lamp base */}
      <ellipse cx="5.5" cy="21" rx="3.5" ry="1" />
      {/* Lamp pole lower */}
      <line x1="5.5" y1="21" x2="3" y2="14" />
      {/* Lamp pole upper (angled arm) */}
      <line x1="3" y1="14" x2="7" y2="7" />
      {/* Lamp joint */}
      <circle cx="3" cy="14" r="0.6" fill="currentColor" />
      {/* Lamp head (cone shade) */}
      <path d="M4.5 7.5 L7 7 L9.5 7.5 L7 4 Z" fill="currentColor" opacity="0.15" />
      <path d="M4.5 7.5 L7 7 L9.5 7.5" />
      <line x1="7" y1="4" x2="4.5" y2="7.5" />
      <line x1="7" y1="4" x2="9.5" y2="7.5" />
      {/* Light rays */}
      <line x1="7" y1="8" x2="7" y2="9.5" strokeWidth="1" opacity="0.4" />
      <line x1="5.5" y1="8.2" x2="5" y2="9.5" strokeWidth="1" opacity="0.3" />
      <line x1="8.5" y1="8.2" x2="9" y2="9.5" strokeWidth="1" opacity="0.3" />

      {/* iPad */}
      <rect x="13" y="5" width="9" height="14" rx="1.5" ry="1.5" />
      {/* iPad screen */}
      <rect x="14" y="6.5" width="7" height="10.5" rx="0.5" ry="0.5" strokeWidth="0" fill="currentColor" opacity="0.06" />
      {/* iPad home button / indicator */}
      <line x1="15.5" y1="18" x2="19.5" y2="18" strokeWidth="1.25" opacity="0.5" />
    </svg>
  );
}
