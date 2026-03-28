import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, HandHeart, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const schema = z.object({
  message: z.string().min(10, "Please share at least a few words about your need.").max(2000, "Please keep under 2000 characters."),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TEAM_COOLDOWN_KEY = "kp_team_req_ts";
const TEAM_COOLDOWN_MS = 5 * 60 * 1000;

export function TeamPrayerRequestModal({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { message: "" },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("prayer_requests" as any).insert({
        requester_id: user.id,
        request_type: "team",
        message: values.message.trim(),
      } as any);
      if (error) throw error;

      setSubmitted(true);
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

  const handleClose = () => {
    setSubmitted(false);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-xl" style={{ background: "hsl(38 60% 97%)" }}>
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center space-y-4"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ background: "linear-gradient(135deg, hsl(42 85% 52%), hsl(35 82% 44%))" }}
            >
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold" style={{ color: "hsl(25 35% 14%)" }}>
                Your request has been received
              </h3>
              <p className="text-sm mt-2 leading-relaxed max-w-xs mx-auto" style={{ color: "hsl(25 18% 50%)" }}>
                The KeepPray.ing team will lovingly craft a personal prayer for you. We'll notify you when you are being prayed over — watch for it on your Prayer Board.
              </p>
            </div>
            <Button
              onClick={handleClose}
              className="rounded-xl h-10 px-6 font-medium"
              style={{ background: "linear-gradient(135deg, hsl(42 85% 46%), hsl(35 82% 54%))", color: "white" }}
            >
              Amen 🙏
            </Button>
          </motion.div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl" style={{ color: "hsl(25 35% 14%)" }}>
                Ask KeepPray.ing to Create a Prayer for You
              </DialogTitle>
              <DialogDescription className="text-sm" style={{ color: "hsl(25 18% 50%)" }}>
                Share what's on your heart — our team will craft a personal, compassionate prayer just for you and place it on your Prayer Board.
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
                        What would you like us to pray about?
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="I need prayer for… / My heart is heavy about… / Please pray for my…"
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

                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl h-11 font-medium gap-2"
                    style={{
                      background: "linear-gradient(135deg, hsl(42 85% 46%), hsl(35 82% 54%))",
                      color: "white",
                    }}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <HandHeart className="w-4 h-4" />
                    )}
                    {submitting ? "Sending…" : "Send My Request to KeepPray.ing"}
                  </Button>
                </motion.div>

                <p className="text-[10px] text-center" style={{ color: "hsl(25 18% 60%)" }}>
                  This is a private request — only the KeepPray.ing team will see it. You'll be notified when your prayer is ready.
                </p>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
