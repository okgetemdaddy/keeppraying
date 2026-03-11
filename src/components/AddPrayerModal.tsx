import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Sparkles } from "lucide-react";

const FAITH_KEYWORDS = ["prayer","pray","lord","god","jesus","christ","holy","spirit","father","heaven","faith","grace","mercy","love","peace","hope","forgiveness","blessing","salvation","worship","praise","scripture","bible","amen","healing","strength","guidance","trust","wisdom","gratitude","thankful","provision","protection","intercession","devotion","righteousness","eternal","covenant","redemption","sanctification"];

function extractTags(text: string): string[] {
  const lower = text.toLowerCase();
  const found = FAITH_KEYWORDS.filter(kw => lower.includes(kw));
  // Also extract common prayer topics
  const topicMap: Record<string, string[]> = {
    "morning-prayer": ["morning","wake","arise","sunrise","today","day begins"],
    "healing": ["heal","sick","illness","disease","health","recovery"],
    "peace": ["peace","anxiety","worry","fear","calm","rest"],
    "strength": ["strength","strong","weak","tired","exhausted","endurance"],
    "forgiveness": ["forgive","forgiveness","sin","repent","mercy"],
    "intercession": ["intercede","others","family","nation","world","people"],
    "gratitude": ["thankful","grateful","gratitude","bless","blessed"],
    "guidance": ["guide","direction","path","wisdom","discern","purpose"],
  };
  const topics: string[] = [];
  for (const [tag, patterns] of Object.entries(topicMap)) {
    if (patterns.some(p => lower.includes(p))) topics.push(tag);
  }
  const combined = [...new Set([...found.slice(0, 3), ...topics.slice(0, 3)])];
  return combined.slice(0, 5);
}

const TEXT_STYLES = [
  { value: "classic", label: "Classic", preview: "font-body text-base" },
  { value: "scripture", label: "Scripture (Italic)", preview: "font-display italic" },
  { value: "peaceful", label: "Peaceful", preview: "font-body text-muted-foreground" },
  { value: "bold", label: "Bold Declaration", preview: "font-body font-semibold" },
  { value: "gentle", label: "Gentle Whisper", preview: "font-body text-sm leading-relaxed" },
  { value: "strong", label: "Strong & Mighty", preview: "font-display text-lg font-bold" },
  { value: "modern", label: "Modern", preview: "font-body tracking-wide" },
  { value: "compassionate", label: "Compassionate", preview: "font-display" },
  { value: "whisper", label: "Whisper", preview: "font-body text-sm italic text-muted-foreground" },
  { value: "royal", label: "Royal Proclamation", preview: "font-display font-bold tracking-wider" },
];

// 5000 words ≈ ~30000 chars (average word = 5 chars + space)
const MAX_WORDS = 5000;
const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const schema = z.object({
  title: z.string().max(120).optional(),
  prayer_text: z.string()
    .min(10, "Prayer must be at least 10 characters")
    .max(35000, "Prayer text too long")
    .refine(v => countWords(v) <= MAX_WORDS, `Prayer must be under ${MAX_WORDS.toLocaleString()} words`),
  extended_prayer: z.string().max(10000).optional(),
  text_style: z.string().default("classic"),
});

type FormValues = z.infer<typeof schema>;

interface AddPrayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function AddPrayerModal({ open, onOpenChange, onSuccess }: AddPrayerModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [moderating, setModerating] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", prayer_text: "", extended_prayer: "", text_style: "classic" },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) { toast({ title: "Please sign in to submit a prayer" }); return; }

    setModerating(true);
    try {
      // Moderate content
      const modResp = await fetch(`${SUPABASE_URL}/functions/v1/moderate-prayer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ prayer_text: values.prayer_text, title: values.title }),
      });
      if (modResp.ok) {
        const modResult = await modResp.json();
        if (!modResult.approved) {
          toast({
            title: "Prayer not submitted",
            description: modResult.reason || "Your prayer didn't meet our community guidelines. Please revise and try again.",
            variant: "destructive",
          });
          setModerating(false);
          return;
        }
      }
    } catch {
      // Moderation failed, continue anyway
    }
    setModerating(false);
    setSubmitting(true);

    try {
      let background_url: string | null = null;

      // Upload background image if provided
      if (bgFile) {
        const ext = bgFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("prayer-backgrounds").upload(path, bgFile, { upsert: true });
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from("prayer-backgrounds").getPublicUrl(path);
          background_url = publicUrl;
        }
      }

      const tags = extractTags(values.prayer_text);

      const { error } = await supabase.from("prayer_cards").insert({
        title: values.title || null,
        prayer_text: values.prayer_text,
        extended_prayer: values.extended_prayer || null,
        text_style: values.text_style,
        background_url,
        tags,
        status: "pending",
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Prayer submitted! 🙏",
        description: "Your prayer has been submitted for review. It will appear in the collection once approved.",
      });
      form.reset();
      setBgFile(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast({
        title: "Submission failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const charCount = form.watch("prayer_text")?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Share a Prayer</DialogTitle>
          <DialogDescription>
            Submit your prayer to the community. All prayers are reviewed before publishing.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="e.g. A Prayer for Peace" {...field} className="rounded-xl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="prayer_text" render={({ field }) => (
              <FormItem>
                <FormLabel>Prayer <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Write your prayer here…"
                    rows={5}
                    className="rounded-xl resize-none"
                    {...field}
                  />
                </FormControl>
                <div className="flex justify-between items-center">
                  <FormMessage />
                  <span className={`text-xs ml-auto ${charCount > 900 ? "text-destructive" : "text-muted-foreground"}`}>{charCount}/1000</span>
                </div>
              </FormItem>
            )} />

            <FormField control={form.control} name="extended_prayer" render={({ field }) => (
              <FormItem>
                <FormLabel>Scripture / Extended Context <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                <FormControl>
                  <Textarea placeholder="Add a Bible verse or extended prayer…" rows={3} className="rounded-xl resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="text_style" render={({ field }) => (
              <FormItem>
                <FormLabel>Text Style</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Choose a style" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TEXT_STYLES.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        <span className={s.preview}>{s.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>How your prayer text will be displayed</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {/* Preview */}
            {form.watch("prayer_text") && (
              <div className="prayer-card p-4">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <p className={`${TEXT_STYLES.find(s => s.value === form.watch("text_style"))?.preview || ""} text-foreground leading-relaxed text-sm`}>
                  {form.watch("prayer_text")}
                </p>
              </div>
            )}

            {/* Background upload */}
            <FormItem>
              <FormLabel>Background Image <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-input cursor-pointer hover:bg-accent transition-colors text-sm">
                  <Upload className="w-4 h-4" />
                  {bgFile ? bgFile.name : "Choose image"}
                  <input type="file" accept="image/*" className="hidden" onChange={e => setBgFile(e.target.files?.[0] || null)} />
                </label>
                {bgFile && <button type="button" onClick={() => setBgFile(null)} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>}
              </div>
            </FormItem>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="rounded-xl flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || moderating} className="btn-gold rounded-xl flex-1 gap-2">
                {moderating ? <><Loader2 className="w-4 h-4 animate-spin" />Checking…</> :
                 submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> :
                 <><Sparkles className="w-4 h-4" />Submit Prayer</>}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
