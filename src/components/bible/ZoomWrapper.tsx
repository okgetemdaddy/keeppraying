import React from "react";

interface ZoomWrapperProps {
  zoom: number;
  textSpacing: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps the Bible verse container + InkOverlay with CSS-transform zoom
 * and a --verse-spacing CSS variable for iPad text spacing control.
 */
export function ZoomWrapper({ zoom, textSpacing, children, className = "" }: ZoomWrapperProps) {
  return (
    <div
      className={`relative origin-top-left bg-[#FDFBF7] dark:bg-transparent ${className}`}
      style={{
        transform: zoom !== 1 ? `scale(${zoom})` : undefined,
        transformOrigin: "top left",
        width: zoom !== 1 ? `${100 / zoom}%` : undefined,
        touchAction: "pan-y",
        // CSS variable consumed by verse elements for extra writing room
        ["--verse-spacing" as string]: textSpacing,
      }}
    >
      {children}
    </div>
  );
}
