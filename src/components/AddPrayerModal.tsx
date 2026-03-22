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
import { useNavigate } from "react-router-dom";

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

export default function AddPrayerModal({ open, onOpenChange, onSuccess }: AddPrayerModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [bgFile, setBgFile] = useState<File | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", prayer_text: "", extended_prayer: "", text_style: "classic" },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) { toast({ title: "Please sign in to submit a prayer" }); return; }
    setSubmitting(true);

    try {
      let background_url: string | null = null;

      if (bgFile) {
        const ext = bgFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("prayer-backgrounds").upload(path, bgFile, { upsert: true });
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from("prayer-backgrounds").getPublicUrl(path);
          background_url = publicUrl;
        }
      }

      // Insert prayer as private — immediately visible on board
      const { data: card, error } = await supabase.from("prayer_cards").insert({
        title: values.title || null,
        prayer_text: values.prayer_text,
        extended_prayer: values.extended_prayer || null,
        text_style: values.text_style,
        background_url,
        tags: [],
        status: "private",
        created_by: user.id,
      }).select("id").single();

      if (error) throw error;

      // Auto-add to board
      if (card?.id) {
        await supabase.from("user_saved_prayers").insert({
          user_id: user.id,
          prayer_id: card.id,
          position: 0,
        });
      }

      toast({
        title: "Prayer saved to your board 🙏",
        description: "It's private by default. Open your board to add tags, scripture, or share with the community.",
        action: (
          <button
            onClick={() => navigate("/board")}
            className="text-xs font-medium underline underline-offset-2 hover:no-underline"
          >
            View Board
          </button>
        ) as React.ReactElement,
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

  const prayerText = form.watch("prayer_text") || "";
  const wordCount = countWords(prayerText);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Write a Prayer</DialogTitle>
          <DialogDescription>
            Your prayer is saved privately to your board. You can choose to share it with the community afterwards.
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
                  <span className={`text-xs ml-auto ${wordCount > 4500 ? "text-destructive" : "text-muted-foreground"}`}>{wordCount.toLocaleString()}/{MAX_WORDS.toLocaleString()} words</span>
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
              <Button type="submit" disabled={submitting} className="btn-gold rounded-xl flex-1 gap-2">
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
                  : <><Sparkles className="w-4 h-4" />Save to Board</>}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
