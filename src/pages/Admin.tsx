import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, X } from "lucide-react";

export default function Admin() {
  const [pending, setPending] = useState<{id:string;title:string|null;prayer_text:string;created_at:string}[]>([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0 });
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const [{ data: p }, { count: total }, { count: approved }, { count: pend }] = await Promise.all([
        supabase.from("prayer_cards").select("id,title,prayer_text,created_at").eq("status","pending").order("created_at", { ascending: false }),
        supabase.from("prayer_cards").select("*", { count: "exact", head: true }),
        supabase.from("prayer_cards").select("*", { count: "exact", head: true }).eq("status","approved"),
        supabase.from("prayer_cards").select("*", { count: "exact", head: true }).eq("status","pending"),
      ]);
      setPending(p || []);
      setStats({ total: total||0, approved: approved||0, pending: pend||0 });
    };
    load();
  }, []);

  const review = async (id: string, action: "approved"|"rejected") => {
    await supabase.from("prayer_cards").update({ status: action }).eq("id", id);
    setPending(prev => prev.filter(p => p.id !== id));
    toast({ title: action === "approved" ? "Prayer approved ✓" : "Prayer rejected" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm"><ArrowLeft className="w-4 h-4" /> Home</Link>
        <h1 className="font-display text-3xl font-bold mb-6">Admin Dashboard</h1>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[["Total Prayers", stats.total], ["Approved", stats.approved], ["Pending Review", stats.pending]].map(([label, val]) => (
            <div key={String(label)} className="prayer-card p-5 text-center">
              <div className="font-display text-3xl font-bold text-primary">{val}</div>
              <div className="text-sm text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </div>
        <h2 className="font-display text-xl font-semibold mb-4">Review Queue ({pending.length})</h2>
        {pending.length === 0 ? <p className="text-muted-foreground text-sm">No prayers pending review 🙏</p> : (
          <div className="space-y-4">
            {pending.map(p => (
              <div key={p.id} className="prayer-card p-5 space-y-3">
                {p.title && <h3 className="font-semibold">{p.title}</h3>}
                <p className="text-sm text-muted-foreground line-clamp-3">{p.prayer_text}</p>
                <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => review(p.id, "approved")} className="btn-gold rounded-xl gap-1.5"><Check className="w-3.5 h-3.5" />Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => review(p.id, "rejected")} className="rounded-xl gap-1.5"><X className="w-3.5 h-3.5" />Reject</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
