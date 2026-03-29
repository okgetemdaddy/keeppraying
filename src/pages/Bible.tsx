import React from "react";
import { SiteNav } from "@/components/SiteNav";
import { BibleReader } from "@/components/bible/BibleReader";

export default function Bible() {
  return (
    <>
      <SiteNav />
      <main className="pt-16">
        <BibleReader />
      </main>
    </>
  );
}
