import React, { useState, useEffect } from "react";
import { SiteNav } from "@/components/SiteNav";
import { BibleReader } from "@/components/bible/BibleReader";
import { isKeepReading } from "@/lib/hostDetect";
import { KeepReadingNav } from "@/components/keepreading/KeepReadingNav";
import { PrayerResourcesDrawer } from "@/components/keepreading/PrayerResourcesDrawer";

export default function Bible() {
  const [focusMode, setFocusMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const kr = isKeepReading();

  // Disable browser swipe-to-go-back while on /bible
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.style.overscrollBehaviorX = "none";
    body.style.overscrollBehaviorX = "none";
    html.style.touchAction = "pan-y pinch-zoom";
    body.style.touchAction = "pan-y pinch-zoom";
    return () => {
      html.style.overscrollBehaviorX = "";
      body.style.overscrollBehaviorX = "";
      html.style.touchAction = "";
      body.style.touchAction = "";
    };
  }, []);

  useEffect(() => {
    const hide = () => setFocusMode(true);
    const show = () => setFocusMode(false);
    window.addEventListener("tabbar:hide", hide);
    window.addEventListener("tabbar:show", show);
    return () => {
      window.removeEventListener("tabbar:hide", hide);
      window.removeEventListener("tabbar:show", show);
    };
  }, []);

  // On KeepPray.ing's /bible route, inject cross-domain canonical
  useEffect(() => {
    if (kr) return;
    const link = document.createElement("link");
    link.rel = "canonical";
    link.href = "https://keepread.ing/";
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, [kr]);

  return (
    <>
      {!focusMode && <KeepReadingNav onOpenDrawer={kr ? () => setDrawerOpen(true) : undefined} />}
      <main className={focusMode ? "" : "pt-16"}>
        <BibleReader />
      </main>
      {kr && <PrayerResourcesDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />}
    </>
  );
}
