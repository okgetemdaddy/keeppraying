import { useState, useEffect } from "react";
import SacredSpinner from "@/components/SacredSpinner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BreathPrayerCard from "@/components/breath/BreathPrayerCard";
import AddBreathPrayerModal from "@/components/breath/AddBreathPrayerModal";
import { useBreathPrayers, useDailyBreath } from "@/hooks/useBreathPrayers";
import { motion, type Variants } from "framer-motion";
import { Wind, Plus, Loader2, Sparkles, Search, FolderPlus } from "lucide-react";
import VerseLink from "@/components/VerseLink";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const pageVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export default function Breathe() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { prayers, loading, refresh } = useBreathPrayers();
  const { prayer: dailyBreath, loading: dailyLoading } = useDailyBreath();
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [savingCollection, setSavingCollection] = useState(false);

  const filtered = search.trim()
    ? prayers.filter(p =>
        p.prayer_text.toLowerCase().includes(search.toLowerCase()) ||
        (p.labels || []).some(l => l.toLowerCase().includes(search.toLowerCase()))
      )
    : prayers;

  const createCollection = async () => {
    if (!user || !collectionName.trim()) return;
    setSavingCollection(true);
    try {
      await supabase.from("breath_collections" as any).insert({
        user_id: user.id,
        name: collectionName.trim(),
      } as any);
      toast({ title: "Collection created ✨" });
      setCollectionName("");
      setCollectionOpen(false);
    } catch {
      toast({ title: "Failed to create", variant: "destructive" });
    } finally {
      setSavingCollection(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-divine" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(ellipse at 50% 30%, hsl(42 85% 46% / 0.15) 0%, transparent 70%)",
        }} />
        <motion.div
          initial="hidden" animate="show" variants={pageVariants}
          className="container mx-auto px-4 max-w-2xl text-center relative space-y-5"
        >
          <motion.div variants={fadeUp} className="mx-auto">
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            >
              <Wind className="w-12 h-12 mx-auto" style={{ color: "hsl(42 75% 46%)" }} />
            </motion.div>
          </motion.div>
          <motion.h1 variants={fadeUp} className="font-display text-4xl sm:text-5xl font-bold">
            Breath Prayers
          </motion.h1>
          <motion.p variants={fadeUp} className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
            Powerful one-liner prayers for every moment — short enough to pray in a single breath.
          </motion.p>
          <motion.p variants={fadeUp} className="verse-text text-xs">
            "Be still, and know that I am God." — <VerseLink reference="Psalm 46:10" />
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {user && (
              <Button onClick={() => setAddOpen(true)} className="rounded-xl gap-2" style={{
                background: "linear-gradient(135deg, hsl(42 85% 46%), hsl(35 82% 54%))",
                color: "white",
              }}>
                <Wind className="w-4 h-4" /> Breathe a Prayer
              </Button>
            )}
            {user && (
              <Button variant="outline" className="rounded-xl gap-2" onClick={() => setCollectionOpen(true)}>
                <FolderPlus className="w-4 h-4" /> New Collection
              </Button>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* Daily Breath */}
      {!dailyLoading && dailyBreath && (
        <section className="container mx-auto px-4 max-w-lg -mt-8 mb-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <p className="text-xs text-center font-medium uppercase tracking-widest mb-3" style={{ color: "hsl(42 75% 46%)" }}>
              <Sparkles className="w-3 h-3 inline mr-1" />
              Today's Breath
            </p>
            <BreathPrayerCard
              id={dailyBreath.id}
              prayer_text={dailyBreath.prayer_text}
              labels={dailyBreath.labels}
              extended_prayer={dailyBreath.extended_prayer}
              meditation_link={dailyBreath.meditation_link}
              likes_count={dailyBreath.likes_count}
              prayed_count={dailyBreath.prayed_count}
              userId={user?.id || null}
            />
          </motion.div>
        </section>
      )}

      {/* Search */}
      <section className="container mx-auto px-4 max-w-2xl mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search breath prayers…"
            className="pl-10 rounded-xl"
          />
        </div>
      </section>

      {/* Grid */}
      <section className="container mx-auto px-4 max-w-3xl pb-20">
        {loading ? (
          <SacredSpinner />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Wind className="w-10 h-10 mx-auto text-muted-foreground opacity-40" />
            <p className="text-muted-foreground text-sm">
              {search ? "No breath prayers match your search." : "No breath prayers yet. Be the first to breathe one."}
            </p>
          </div>
        ) : (
          <motion.div
            initial="hidden" animate="show" variants={pageVariants}
            className="grid grid-cols-1 sm:grid-cols-2 gap-5"
          >
            {filtered.map(p => (
              <motion.div key={p.id} variants={fadeUp}>
                <BreathPrayerCard
                  id={p.id}
                  prayer_text={p.prayer_text}
                  labels={p.labels}
                  extended_prayer={p.extended_prayer}
                  meditation_link={p.meditation_link}
                  likes_count={p.likes_count}
                  prayed_count={p.prayed_count}
                  userId={user?.id || null}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      <AddBreathPrayerModal open={addOpen} onOpenChange={setAddOpen} onSuccess={refresh} />

      {/* Create Collection Dialog */}
      <Dialog open={collectionOpen} onOpenChange={setCollectionOpen}>
        <DialogContent className="max-w-sm" style={{ borderRadius: "1.5rem" }}>
          <DialogHeader>
            <DialogTitle className="font-display">New Collection</DialogTitle>
            <DialogDescription>Group your favorite breath prayers together.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              value={collectionName}
              onChange={e => setCollectionName(e.target.value)}
              placeholder="Collection name…"
              className="rounded-xl"
              maxLength={80}
            />
            <Button
              onClick={createCollection}
              disabled={savingCollection || !collectionName.trim()}
              className="w-full rounded-xl gap-2"
              style={{
                background: "linear-gradient(135deg, hsl(42 85% 46%), hsl(35 82% 54%))",
                color: "white",
              }}
            >
              {savingCollection ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
