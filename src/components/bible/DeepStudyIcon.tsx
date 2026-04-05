import React from "react";

interface DeepStudyIconProps {
  size?: number;
  className?: string;
  color?: string;
}

/**
 * Anchor centered over an open book silhouette.
 * Open-book shape mirrors the KeepPray.ing logo style.
 */
export const DeepStudyIcon: React.FC<DeepStudyIconProps> = ({
  size = 24,
  className = "",
  color = "currentColor",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    {/* Open book – two fanned pages meeting at a spine */}
    <path
      d="M12 10C12 10 9.5 8.5 5 8.5C3.5 8.5 2 9 2 9V21C2 21 3.5 20.5 5 20.5C9.5 20.5 12 22 12 22"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M12 10C12 10 14.5 8.5 19 8.5C20.5 8.5 22 9 22 9V21C22 21 20.5 20.5 19 20.5C14.5 20.5 12 22 12 22"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Spine */}
    <line x1="12" y1="10" x2="12" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />

    {/* Anchor – compact, above the book */}
    {/* Ring at top */}
    <circle cx="12" cy="3" r="1.5" stroke={color} strokeWidth="1.3" fill="none" />
    {/* Vertical shaft */}
    <line x1="12" y1="4.5" x2="12" y2="10" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    {/* Cross bar */}
    <line x1="9.5" y1="6.5" x2="14.5" y2="6.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    {/* Flukes */}
    <path
      d="M8.5 8.5C9.5 10 10.5 10 12 10C13.5 10 14.5 10 15.5 8.5"
      stroke={color}
      strokeWidth="1.3"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);
