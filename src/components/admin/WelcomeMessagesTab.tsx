import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Pencil, Save, X, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface WelcomeMessage {
  id: string;
  user_id: string;
  message: string;
  active_date: string;
  created_at: string;
  profile_name?: string;
}

export default function WelcomeMessagesTab() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<WelcomeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchDate, setSearchDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("daily_welcome_messages")
      .select("*")
      .eq("active_date", searchDate)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load messages", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch profile names for user_ids
    const userIds = [...new Set((data || []).map((m) => m.user_id))];
    let profileMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      profileMap = Object.fromEntries(
        (profiles || []).map((p) => [p.id, p.full_name || p.email || "Unknown"])
      );
    }

    setMessages(
      (data || []).map((m) => ({
        ...m,
        profile_name: profileMap[m.user_id] || "Unknown user",
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, [searchDate]);

  const startEdit = (msg: WelcomeMessage) => {
    setEditingId(msg.id);
    setEditText(msg.message);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("daily_welcome_messages")
      .update({ message: editText.trim() })
      .eq("id", id);

    if (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    } else {
      toast({ title: "Welcome message updated" });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, message: editText.trim() } : m
        )
      );
      setEditingId(null);
      setEditText("");
    }
    setSaving(false);
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase
      .from("daily_welcome_messages")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Message deleted" });
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-white mb-1">
          Daily Welcome Messages
        </h2>
        <p className="text-sm text-slate-400">
          View and edit the AI-generated daily welcome messages shown to users on
          their Prayer Station.
        </p>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-3">
        <Input
          type="date"
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
          className="w-48 rounded-xl bg-slate-800/50 border-slate-700 text-white"
        />
        <span className="text-sm text-slate-400">
          {messages.length} message{messages.length !== 1 ? "s" : ""} for this
          date
        </span>
      </div>

      {/* Messages list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          No welcome messages for {format(new Date(searchDate + "T00:00"), "MMMM d, yyyy")}.
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-amber-300">
                  {msg.profile_name}
                </span>
                <span className="text-xs text-slate-500">
                  {format(new Date(msg.created_at), "h:mm a")}
                </span>
              </div>

              {editingId === msg.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-[80px] rounded-xl bg-slate-900/50 border-slate-600 text-white text-sm"
                    maxLength={500}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveEdit(msg.id)}
                      disabled={saving || !editText.trim()}
                      className="rounded-xl gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900"
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEdit}
                      className="rounded-xl gap-1.5 text-slate-400"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-300 leading-relaxed">
                  {msg.message}
                </p>
              )}

              {editingId !== msg.id && (
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(msg)}
                    className="rounded-xl gap-1.5 text-slate-400 hover:text-white h-7 text-xs"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMessage(msg.id)}
                    className="rounded-xl gap-1.5 text-red-400 hover:text-red-300 h-7 text-xs"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
