import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ResponsiveDialog as Dialog, ResponsiveDialogContent as DialogContent, ResponsiveDialogHeader as DialogHeader, ResponsiveDialogTitle as DialogTitle, ResponsiveDialogDescription as DialogDescription } from "@/components/ui/responsive-dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Heart, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const schema = z.object({
  message: z.string().min(10, "Please share at least a few words about your need.").max(2000, "Please keep under 2000 characters."),
  is_urgent: z.boolean().default(false),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMMUNITY_COOLDOWN_KEY = "kp_community_req_ts";
const COMMUNITY_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export function CommunityPrayerRequestModal({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { message: "", is_urgent: false },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    const lastTs = parseInt(localStorage.getItem(COMMUNITY_COOLDOWN_KEY) || "0", 10);
    if (Date.now() - lastTs < COMMUNITY_COOLDOWN_MS) {
      toast({ title: "Please wait a few minutes before submitting another request.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Create the prayer request
      const { error: reqError } = await supabase.from("prayer_requests" as any).insert({
        requester_id: user.id,
        request_type: "community",
        message: values.message.trim(),
        is_urgent: values.is_urgent,
      } as any);
      if (reqError) throw reqError;

      // Also create a prayer card on the prayer wall
      const { error: cardError } = await supabase.from("prayer_cards").insert({
        prayer_text: values.message.trim(),
        created_by: user.id,
        status: "approved",
        source: "community",
        labels: values.is_urgent ? ["urgent", "community-request"] : ["community-request"],
      });
      if (cardError) throw cardError;

      toast({
        title: "Your prayer request has been shared 🙏",
        description: "Prayer warriors are being notified. You'll see responses in your notifications.",
      });
      localStorage.setItem(COMMUNITY_COOLDOWN_KEY, Date.now().toString());
      form.reset();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Could not submit request",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-xl" style={{ background: "hsl(38 60% 97%)" }}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl" style={{ color: "hsl(25 35% 14%)" }}>
            Ask the Community to Pray for You
          </DialogTitle>
          <DialogDescription className="text-sm" style={{ color: "hsl(25 18% 50%)" }}>
            Share your heart — prayer warriors on standby will be gently notified, and your request will appear on the Prayer Wall for the community to lift up.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-2">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium" style={{ color: "hsl(25 28% 28%)" }}>
                    What would you like prayer for?
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Lord, I need prayer for..."
                      className="min-h-[120px] rounded-xl resize-none text-sm border-border/50 focus:ring-primary/30"
                      style={{ background: "hsl(38 45% 99%)" }}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-[10px] text-right" style={{ color: "hsl(25 18% 60%)" }}>
                    {field.value?.length || 0}/2000
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_urgent"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 rounded-xl p-3" style={{ background: field.value ? "hsl(0 72% 97%)" : "hsl(38 28% 93%)" }}>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="flex-1">
                    <FormLabel className="text-xs font-medium flex items-center gap-1.5 cursor-pointer" style={{ color: field.value ? "hsl(0 72% 40%)" : "hsl(25 28% 28%)" }}>
                      {field.value && <AlertTriangle className="w-3.5 h-3.5" />}
                      Mark as urgent
                    </FormLabel>
                    <p className="text-[10px] mt-0.5" style={{ color: "hsl(25 18% 55%)" }}>
                      Urgent requests notify standby warriors immediately
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl h-11 font-medium gap-2"
                style={{
                  background: "var(--gradient-forest)",
                  color: "white",
                }}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Heart className="w-4 h-4" />
                )}
                {submitting ? "Sharing your request…" : "Share My Prayer Request"}
              </Button>
            </motion.div>

            <p className="text-[10px] text-center" style={{ color: "hsl(25 18% 60%)" }}>
              Your request will be visible on the Prayer Wall and shared with prayer warriors.
            </p>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
