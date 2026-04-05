import React from "react";

interface BibleSightIconProps {
  size?: number;
  className?: string;
  color?: string;
}

/**
 * Sparkle ✦ layered in front of an open book silhouette.
 * Open-book shape mirrors the KeepPray.ing logo style.
 */
export const BibleSightIcon: React.FC<BibleSightIconProps> = ({
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
      d="M12 6C12 6 9.5 4 5 4C3.5 4 2 4.5 2 4.5V18.5C2 18.5 3.5 18 5 18C9.5 18 12 20 12 20"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M12 6C12 6 14.5 4 19 4C20.5 4 22 4.5 22 4.5V18.5C22 18.5 20.5 18 19 18C14.5 18 12 20 12 20"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Spine */}
    <line x1="12" y1="6" x2="12" y2="20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />

    {/* 4-pointed sparkle – upper-right of the book */}
    <path
      d="M18 2L18.6 4.4L21 5L18.6 5.6L18 8L17.4 5.6L15 5L17.4 4.4L18 2Z"
      fill={color}
    />
  </svg>
);
