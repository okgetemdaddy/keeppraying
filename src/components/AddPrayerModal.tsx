import { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Upload, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TEXT_STYLES = [
  { value: "classic",       label: "Classic",             preview: "font-body text-base" },
  { value: "scripture",     label: "Scripture (Italic)",  preview: "font-display italic" },
  { value: "peaceful",      label: "Peaceful",            preview: "font-body text-muted-foreground" },
  { value: "bold",          label: "Bold Declaration",    preview: "font-body font-semibold" },
  { value: "gentle",        label: "Gentle Whisper",      preview: "font-body text-sm leading-relaxed" },
  { value: "strong",        label: "Strong & Mighty",     preview: "font-display text-lg font-bold" },
  { value: "modern",        label: "Modern",              preview: "font-body tracking-wide" },
  { value: "compassionate", label: "Compassionate",       preview: "font-display" },
  { value: "whisper",       label: "Whisper",             preview: "font-body text-sm italic text-muted-foreground" },
  { value: "royal",         label: "Royal Proclamation",  preview: "font-display font-bold tracking-wider" },
];

const MAX_CHARS = 35000;
const MAX_WORDS = 5000;
const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const schema = z.object({
  title: z.string().max(120).optional(),
  prayer_text: z.string()
    .min(10, "Prayer must be at least 10 characters")
    .max(MAX_CHARS, "Prayer text too long")
    .refine(v => countWords(v) <= MAX_WORDS, `Under ${MAX_WORDS.toLocaleString()} words please`),
  extended_prayer: z.string().max(10000).optional(),
  text_style: z.string().default("classic"),
});

type FormValues = z.infer<typeof schema>;

interface AddPrayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (prayerId?: string) => void;
}

export default function AddPrayerModal({ open, onOpenChange, onSuccess }: AddPrayerModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", prayer_text: "", extended_prayer: "", text_style: "classic" },
  });

  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(280, el.scrollHeight) + "px";
  }, []);

  const onSubmit = async (values: FormValues) => {
    if (!user) { toast({ title: "Please sign in to submit a prayer" }); return; }
    setSubmitting(true);
    try {
      let background_url: string | null = null;
      if (bgFile) {
        const ext = bgFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("prayer-backgrounds").upload(path, bgFile, { upsert: true });
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from("prayer-backgrounds").getPublicUrl(path);
          background_url = publicUrl;
        }
      }

      const { data: card, error } = await supabase.from("prayer_cards").insert({
        title: values.title || null,
        prayer_text: values.prayer_text,
        extended_prayer: values.extended_prayer || null,
        text_style: values.text_style,
        background_url,
        labels: [],
        status: "private",
        created_by: user.id,
      }).select("id").single();

      if (error) throw error;

      if (card?.id) {
        await supabase.from("user_saved_prayers").insert({
          user_id: user.id,
          prayer_id: card.id,
          position: 0,
        });
      }

      toast({
        title: "Prayer saved to your board 🙏",
        description: "Private by default. Open your board to add labels, scripture, or share with the community.",
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
      if (textareaRef.current) textareaRef.current.style.height = "280px";
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
  const charCount = prayerText.length;
  const selectedStyle = TEXT_STYLES.find(s => s.value === form.watch("text_style"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-h-[95vh] overflow-y-auto border-0 shadow-2xl p-0"
        style={{
          maxWidth: "min(56rem, 95vw)",
          background: "hsl(42 55% 99%)",
          boxShadow: "0 32px 80px -16px rgba(0,0,0,0.22), 0 0 0 1px hsl(38 22% 90%)",
        }}
      >
        {/* Modal header */}
        <div
          className="flex items-start justify-between p-6 pb-4"
          style={{ borderBottom: "1px solid hsl(38 22% 92%)" }}
        >
          <DialogHeader className="flex-1">
            <DialogTitle className="font-display text-2xl sm:text-3xl" style={{ color: "hsl(25 35% 14%)" }}>
              Write a Prayer
            </DialogTitle>
            <DialogDescription className="text-sm" style={{ color: "hsl(25 18% 52%)" }}>
              Your prayer is saved privately to your board. You can share it with the community afterwards.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Two-column layout on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_280px] min-h-[400px]">

              {/* ── Left column — writing area ─────────────────────────── */}
              <div className="p-6 space-y-5 border-r" style={{ borderColor: "hsl(38 22% 92%)" }}>
                {/* Title */}
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormControl>
                      <input
                        {...field}
                        placeholder="A title for this prayer… (optional)"
                        className="w-full outline-none bg-transparent text-xl font-display font-semibold placeholder:font-normal transition-colors"
                        style={{
                          color: "hsl(25 35% 14%)",
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Divider */}
                <div style={{ height: 1, background: "hsl(38 22% 90%)" }} />

                {/* Prayer textarea — the hero */}
                <FormField control={form.control} name="prayer_text" render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <div className="relative">
                        <textarea
                          {...field}
                          ref={textareaRef}
                          placeholder="Lord, I come before you today…"
                          rows={12}
                          onInput={autoGrow}
                          onChange={e => { field.onChange(e); autoGrow(); }}
                          className="w-full resize-none outline-none font-display text-lg leading-[1.9] transition-shadow rounded-2xl"
                          style={{
                            minHeight: 280,
                            padding: "1.25rem 1.25rem",
                            background: "hsl(38 55% 99%)",
                            boxShadow: "inset 0 2px 12px hsl(42 75% 46% / 0.07), 0 0 0 1.5px hsl(38 22% 88%)",
                            color: "hsl(25 30% 18%)",
                          }}
                          onFocus={e => {
                            e.target.style.boxShadow = "inset 0 2px 16px hsl(42 75% 46% / 0.10), 0 0 0 2px hsl(42 75% 55%)";
                          }}
                          onBlur={e => {
                            e.target.style.boxShadow = "inset 0 2px 12px hsl(42 75% 46% / 0.07), 0 0 0 1.5px hsl(38 22% 88%)";
                          }}
                        />
                        {/* Word counter — floating in corner */}
                        <span
                          className={cn(
                            "absolute bottom-3 right-4 text-[11px] pointer-events-none select-none transition-colors",
                            wordCount > 4500 ? "text-destructive" : "opacity-40"
                          )}
                          style={{ color: wordCount > 4500 ? undefined : "hsl(25 18% 40%)" }}
                        >
                          {wordCount.toLocaleString()} / {MAX_WORDS.toLocaleString()} words
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Collapsible extras */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="extras" className="border rounded-2xl px-4" style={{ borderColor: "hsl(38 22% 90%)" }}>
                    <AccordionTrigger
                      className="text-sm font-medium py-3 hover:no-underline"
                      style={{ color: "hsl(25 18% 52%)" }}
                    >
                      <span className="flex items-center gap-2">
                        <ChevronDown className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        Scripture & extended context
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-4">
                      <FormField control={form.control} name="extended_prayer" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium" style={{ color: "hsl(25 18% 52%)" }}>
                            Bible verse or extended prayer
                          </FormLabel>
                          <FormControl>
                            <textarea
                              {...field}
                              placeholder="Add a supporting verse, context, or continued prayer…"
                              rows={4}
                              className="w-full resize-none rounded-xl text-sm leading-relaxed outline-none transition-shadow"
                              style={{
                                padding: "0.75rem 1rem",
                                background: "hsl(38 50% 98%)",
                                boxShadow: "inset 0 1px 6px hsl(42 75% 46% / 0.05), 0 0 0 1.5px hsl(38 22% 88%)",
                                color: "hsl(25 28% 24%)",
                              }}
                              onFocus={e => { e.target.style.boxShadow = "inset 0 1px 8px hsl(42 75% 46% / 0.08), 0 0 0 2px hsl(42 75% 55%)"; }}
                              onBlur={e => { e.target.style.boxShadow = "inset 0 1px 6px hsl(42 75% 46% / 0.05), 0 0 0 1.5px hsl(38 22% 88%)"; }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="media" className="border rounded-2xl px-4 mt-2" style={{ borderColor: "hsl(38 22% 90%)" }}>
                    <AccordionTrigger
                      className="text-sm font-medium py-3 hover:no-underline"
                      style={{ color: "hsl(25 18% 52%)" }}
                    >
                      <span className="flex items-center gap-2">
                        <ChevronDown className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        Background image
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="flex items-center gap-3">
                        <label
                          className="flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer hover:bg-accent/40 transition-colors text-sm"
                          style={{ borderColor: "hsl(38 22% 88%)", color: "hsl(25 18% 46%)" }}
                        >
                          <Upload className="w-4 h-4" />
                          {bgFile ? bgFile.name : "Choose image"}
                          <input type="file" accept="image/*" className="hidden" onChange={e => setBgFile(e.target.files?.[0] || null)} />
                        </label>
                        {bgFile && (
                          <button
                            type="button"
                            onClick={() => setBgFile(null)}
                            className="text-xs hover:text-destructive transition-colors"
                            style={{ color: "hsl(25 18% 56%)" }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* ── Right column — style picker + preview ────────────────── */}
              <div className="p-6 flex flex-col gap-5" style={{ background: "hsl(42 50% 98%)" }}>
                {/* Style picker */}
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "hsl(25 18% 52%)" }}>
                    Text Style
                  </p>
                  <FormField control={form.control} name="text_style" render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger
                            className="rounded-xl text-sm h-10"
                            style={{ background: "hsl(42 55% 99%)", borderColor: "hsl(38 22% 88%)" }}
                          >
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
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Live preview */}
                <div className="flex-1 flex flex-col gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "hsl(25 18% 52%)" }}>
                    Preview
                  </p>
                  <div
                    className="flex-1 rounded-2xl p-4 relative overflow-hidden"
                    style={{
                      background: "hsl(42 55% 97%)",
                      boxShadow: "inset 0 1px 8px hsl(42 75% 46% / 0.06), 0 0 0 1px hsl(38 22% 88%)",
                      minHeight: 160,
                    }}
                  >
                    {/* Decorative quote */}
                    <div
                      className="absolute top-1 right-2 font-display font-bold leading-none pointer-events-none"
                      style={{ fontSize: "4rem", color: "hsl(42 80% 60% / 0.10)" }}
                      aria-hidden
                    >
                      "
                    </div>
                    {prayerText ? (
                      <p
                        className={cn("text-sm leading-relaxed relative", selectedStyle?.preview || "")}
                        style={{ color: "hsl(25 28% 28%)" }}
                      >
                        {prayerText.length > 300 ? prayerText.slice(0, 297) + "…" : prayerText}
                      </p>
                    ) : (
                      <p className="text-sm italic" style={{ color: "hsl(25 18% 66%)" }}>
                        Your prayer will appear here…
                      </p>
                    )}
                  </div>
                </div>

                {/* Char stat */}
                <div className="text-xs text-center" style={{ color: "hsl(25 18% 66%)" }}>
                  {charCount > 0 && `${charCount.toLocaleString()} characters`}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div
              className="flex gap-3 p-6 pt-4"
              style={{ borderTop: "1px solid hsl(38 22% 92%)", background: "hsl(42 55% 99%)" }}
            >
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl flex-none px-6"
                style={{ borderColor: "hsl(38 22% 88%)" }}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="btn-gold rounded-2xl flex-1 gap-2 h-11 text-base"
              >
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
