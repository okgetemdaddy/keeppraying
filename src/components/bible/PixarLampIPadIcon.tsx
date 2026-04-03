import React from "react";
import ipadStudyIcon from "@/assets/ipad-study-icon.png";

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number;
}

/**
 * Custom icon: Pixar-style desk lamp next to an iPad.
 * Uses a hand-crafted illustration for a premium feel.
 */
export function PixarLampIPadIcon({ size = 24, className, style, ...props }: Props) {
  return (
    <img
      src={ipadStudyIcon}
      alt="iPad Study Mode"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain", ...style }}
      draggable={false}
      {...props}
    />
  );
}
