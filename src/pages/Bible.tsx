import React, { useState, useEffect } from "react";
import { SiteNav } from "@/components/SiteNav";
import { BibleReader } from "@/components/bible/BibleReader";

export default function Bible() {
  const [focusMode, setFocusMode] = useState(false);

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

  return (
    <>
      {!focusMode && <SiteNav />}
      <main className={focusMode ? "" : "pt-16"}>
        <BibleReader />
      </main>
    </>
  );
}
