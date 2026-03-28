import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Plus, Save, Trash2, XCircle, Pencil, Sparkles, ToggleLeft, ToggleRight,
} from "lucide-react";

interface Saying {
  id: string;
  text: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

/* Dark-themed admin inputs (matching Admin.tsx style) */
const DarkInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props}
    className={`w-full rounded-xl px-3 py-2 text-sm border outline-none transition-colors focus:ring-1 focus:ring-[hsl(42,85%,46%)] ${props.className ?? ""}`}
    style={{ background: "hsl(220 32% 12%)", borderColor: "hsl(220 26% 20%)", color: "hsl(38 28% 90%)", ...props.style }}
  />
);

const GoldButton = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
  <button {...props}
    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all disabled:opacity-40 ${props.className ?? ""}`}
    style={{ background: "linear-gradient(135deg, hsl(42 85% 44%), hsl(35 82% 54%))", color: "#fff", ...props.style }}>
    {children}
  </button>
);

const GuardianCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl p-4 border ${className ?? ""}`}
    style={{ background: "hsl(220 32% 10%)", borderColor: "hsl(220 26% 17%)" }}>
    {children}
  </div>
);

export default function SayingsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sayings, setSayings] = useState<Saying[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("encouragement");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("keeppraying_sayings")
      .select("*")
      .order("created_at", { ascending: false });
    setSayings((data as Saying[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setShowForm(false); setEditId(null); setText(""); setCategory("encouragement"); };

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await supabase.from("keeppraying_sayings").update({ text: text.trim(), category, updated_at: new Date().toISOString() }).eq("id", editId);
        toast({ title: "Saying updated" });
      } else {
        await supabase.from("keeppraying_sayings").insert({ text: text.trim(), category, created_by: user?.id });
        toast({ title: "Saying added ✨" });
      }
      resetForm();
      load();
    } catch { toast({ title: "Error saving", variant: "destructive" }); }
    setSaving(false);
  };

  const toggleActive = async (s: Saying) => {
    await supabase.from("keeppraying_sayings").update({ is_active: !s.is_active, updated_at: new Date().toISOString() }).eq("id", s.id);
    load();
  };

  const deleteSaying = async (id: string) => {
    await supabase.from("keeppraying_sayings").delete().eq("id", id);
    toast({ title: "Saying removed" });
    load();
  };

  const startEdit = (s: Saying) => {
    setEditId(s.id); setText(s.text); setCategory(s.category); setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "hsl(38 28% 90%)" }}>
            <Sparkles className="w-4 h-4 inline mr-1.5 text-primary" />
            KeepPray.ing Sayings
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "hsl(38 14% 50%)" }}>
            Gentle whispers that appear throughout the app — scripture & encouragement Easter eggs.
          </p>
        </div>
        <GoldButton onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-3.5 h-3.5" /> Add Saying
        </GoldButton>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <GuardianCard className="space-y-3">
              <DarkInput value={text} onChange={e => setText(e.target.value)} placeholder="Enter saying or scripture…" />
              <div className="flex gap-2">
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="rounded-xl px-3 py-2 text-sm border outline-none"
                  style={{ background: "hsl(220 32% 12%)", borderColor: "hsl(220 26% 20%)", color: "hsl(38 28% 90%)" }}>
                  <option value="encouragement">Encouragement</option>
                  <option value="scripture">Scripture</option>
                </select>
                <GoldButton onClick={handleSave} disabled={saving || !text.trim()}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editId ? "Update" : "Save"}
                </GoldButton>
                <button onClick={resetForm} className="text-xs px-3 py-1 rounded-xl"
                  style={{ color: "hsl(38 14% 50%)", border: "1px solid hsl(220 26% 20%)" }}>
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </GuardianCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 py-6" style={{ color: "hsl(38 14% 50%)" }}>
          <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
        </div>
      ) : sayings.length === 0 ? (
        <GuardianCard>
          <p className="text-sm italic text-center py-4" style={{ color: "hsl(38 14% 50%)" }}>
            No sayings yet. Add gentle whispers from the Holy Spirit ✨
          </p>
        </GuardianCard>
      ) : (
        <div className="space-y-2">
          {sayings.map(s => (
            <GuardianCard key={s.id}>
              <div className="flex items-center gap-3">
                <button onClick={() => toggleActive(s)} title={s.is_active ? "Active" : "Inactive"}>
                  {s.is_active
                    ? <ToggleRight className="w-5 h-5 text-green-400" />
                    : <ToggleLeft className="w-5 h-5" style={{ color: "hsl(38 14% 40%)" }} />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${s.is_active ? "" : "line-through opacity-50"}`} style={{ color: "hsl(38 28% 90%)" }}>
                    {s.text}
                  </p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block"
                    style={{ background: s.category === "scripture" ? "hsl(210 55% 88% / 0.15)" : "hsl(42 85% 46% / 0.12)", color: s.category === "scripture" ? "hsl(210 55% 75%)" : "hsl(42 85% 58%)" }}>
                    {s.category}
                  </span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(s)} className="h-7 px-2 rounded-lg"
                    style={{ background: "hsl(42 85% 46% / 0.1)", color: "hsl(42 85% 58%)", border: "1px solid hsl(42 85% 46% / 0.2)" }}>
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => deleteSaying(s.id)} className="h-7 px-2 rounded-lg"
                    style={{ background: "hsl(0 72% 51% / 0.1)", color: "hsl(0 72% 60%)", border: "1px solid hsl(0 72% 51% / 0.2)" }}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </GuardianCard>
          ))}
        </div>
      )}
    </div>
  );
}
