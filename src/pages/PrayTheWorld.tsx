import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SiteNav } from "@/components/SiteNav";
import { Globe, Radio, Megaphone } from "lucide-react";
import WorldMap from "@/components/map/WorldMap";
import LocalRadar from "@/components/map/LocalRadar";
import GrowthCTA from "@/components/map/GrowthCTA";

import { usePrayerMapData } from "@/hooks/usePrayerMapData";

type Tab = "world" | "radar" | "grow";

export default function PrayTheWorld() {
  const [tab, setTab] = useState<Tab>("world");
  const { totalPrayers, todayPrayers, warriorsOnline, regionData } = usePrayerMapData();

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "world", label: "Prayer Warriors", icon: <Globe className="w-4 h-4" /> },
    { id: "radar", label: "Local Radar", icon: <Radio className="w-4 h-4" /> },
    { id: "grow", label: "Grow", icon: <Megaphone className="w-4 h-4" /> },
    
  ];

  return (
    <div className="min-h-screen bg-[hsl(220,60%,4%)] text-white">
      <SiteNav dark />

      {/* Hero stats — all real data with realtime updates */}
      <div className="container mx-auto px-4 pt-6 pb-2 max-w-5xl text-center">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl sm:text-4xl font-bold mb-2"
          style={{ color: "hsl(42, 78%, 60%)" }}
        >
          🌍 Prayer Warriors
        </motion.h1>
        <p className="text-white/50 text-sm mb-4">
          Warriors of faith, praying across the globe in real time
        </p>
        <div className="flex justify-center gap-6 text-sm mb-6">
          <div>
            <span className="text-2xl font-bold" style={{ color: "hsl(42, 78%, 60%)" }}>
              {totalPrayers.toLocaleString()}
            </span>
            <p className="text-white/40 text-xs">prayers lifted</p>
          </div>
          <div>
            <span className="text-2xl font-bold" style={{ color: "hsl(42, 78%, 60%)" }}>
              {todayPrayers.toLocaleString()}
            </span>
            <p className="text-white/40 text-xs">today</p>
          </div>
          <div>
            <span className="text-2xl font-bold" style={{ color: "hsl(42, 78%, 60%)" }}>
              {warriorsOnline}
            </span>
            <p className="text-white/40 text-xs">warriors online</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex gap-1 p-1 rounded-2xl bg-white/5 mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                tab === t.id ? "bg-white/15 text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="container mx-auto px-4 max-w-5xl pb-24">
        <AnimatePresence mode="wait">
          {tab === "world" && (
            <motion.div key="world" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WorldMap totalPrayers={totalPrayers} todayPrayers={todayPrayers} regionData={regionData} />
            </motion.div>
          )}
          {tab === "radar" && (
            <motion.div key="radar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LocalRadar />
            </motion.div>
          )}
          {tab === "grow" && (
            <motion.div key="grow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GrowthCTA totalPrayers={totalPrayers} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
