import React, { createContext, useContext } from "react";

export interface PaperCameraState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface PaperCanvasContextValue {
  camera: React.RefObject<PaperCameraState>;
  deskRef: React.RefObject<HTMLDivElement>;
}

export const PaperCanvasContext = createContext<PaperCanvasContextValue | null>(null);

export function usePaperCamera() {
  return useContext(PaperCanvasContext);
}
