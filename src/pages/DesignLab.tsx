import React from "react";
import { PrayerCardAsset } from "@/components/board/PrayerCardAsset";

export default function DesignLab() {
  return (
    <div
      className="h-screen w-full flex flex-col items-center justify-center px-4 py-6 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 140% 80% at 50% 20%, #1e1a14 0%, #121010 50%, #0a0908 100%)",
      }}
    >
      <PrayerCardAsset />
    </div>
  );
}
