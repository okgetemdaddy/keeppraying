/**
 * BarBtn — themed icon button for the prayer card bottom bar.
 */
import React from "react";
import type { CardTheme } from "./prayerCardTheme";

interface BarBtnProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
  label?: string;
  theme: CardTheme;
  className?: string;
}

export function BarBtn({
  children,
  onClick,
  active,
  label,
  theme,
  className = "",
}: BarBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`relative p-2.5 rounded-xl transition-all duration-200 active:scale-90 group ${className}`}
      style={{ color: active ? theme.iconActive : theme.iconDefault }}
      title={label}
    >
      {children}
    </button>
  );
}
