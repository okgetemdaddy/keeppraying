import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, ChevronDown, ChevronUp, Loader2, Trash2, User } from "lucide-react";

interface Comment {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
}

const schema = z.object({
  text: z.string().min(1, "Comment cannot be empty").max(500, "Comment must be under 500 characters"),
});

export default function Comments({ prayerId }: { prayerId: string }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { text: "" },
  });

  const fetchComments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(full_name, avatar_url)")
      .eq("prayer_id", prayerId)
      .order("created_at", { ascending: true });
    setComments((data as Comment[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    fetchComments();

    // Realtime subscription
    const channel = supabase
      .channel(`comments:${prayerId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "comments",
        filter: `prayer_id=eq.${prayerId}`,
      }, async (payload) => {
        // Fetch profile for new comment
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", (payload.new as Comment).user_id)
          .single();
        setComments(prev => [...prev, { ...(payload.new as Comment), profiles: profile }]);
      })
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "comments",
        filter: `prayer_id=eq.${prayerId}`,
      }, (payload) => {
        setComments(prev => prev.filter(c => c.id !== (payload.old as Comment).id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, prayerId]);

  const onSubmit = async ({ text }: z.infer<typeof schema>) => {
    if (!user) { toast({ title: "Please sign in to comment" }); return; }
    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      prayer_id: prayerId,
      user_id: user.id,
      text: text.trim(),
    });
    if (error) {
      toast({ title: "Failed to post comment", variant: "destructive" });
    } else {
      form.reset();
    }
    setSubmitting(false);
  };

  const deleteComment = async (id: string) => {
    await supabase.from("comments").delete().eq("id", id).eq("user_id", user!.id);
  };

  const charCount = form.watch("text")?.length || 0;

  return (
    <div className="border-t border-border mt-3 pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        <span>{comments.length > 0 ? `${comments.length} comment${comments.length > 1 ? "s" : ""}` : "Comments"}</span>
        {open ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading comments…
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-1">Be the first to comment on this prayer.</p>
          ) : (
            <div className="space-y-2.5">
              {comments.map(c => (
                <div key={c.id} className="flex gap-2 group">
                  <div className="w-6 h-6 rounded-full bg-accent flex-shrink-0 flex items-center justify-center mt-0.5">
                    {c.profiles?.avatar_url ? (
                      <img src={c.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <User className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-foreground">{c.profiles?.full_name || "Anonymous"}</span>
                      <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                      {user?.id === c.user_id && (
                        <button onClick={() => deleteComment(c.id)} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed mt-0.5">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {user ? (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <div className="relative">
                <Textarea
                  placeholder="Add a comment…"
                  rows={2}
                  className="rounded-xl text-xs resize-none pr-16"
                  {...form.register("text")}
                />
                <span className={`absolute bottom-2 right-2 text-xs ${charCount > 450 ? "text-destructive" : "text-muted-foreground"}`}>{charCount}/500</span>
              </div>
              {form.formState.errors.text && (
                <p className="text-xs text-destructive">{form.formState.errors.text.message}</p>
              )}
              <Button type="submit" size="sm" disabled={submitting} className="btn-gold rounded-xl text-xs h-7 px-3">
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Post"}
              </Button>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground italic">Sign in to leave a comment.</p>
          )}
        </div>
      )}
    </div>
  );
}
