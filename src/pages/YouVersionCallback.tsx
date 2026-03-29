/**
 * YouVersion OAuth PKCE Callback
 * Route: /auth/youversion/callback
 *
 * Extracts code & state from the URL, exchanges for tokens,
 * then silently redirects. Shows SacredSpinner during the brief exchange.
 */
import { useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import SacredSpinner from "@/components/SacredSpinner";
import { exchangeYouVersionCode, getPKCEReturnTo } from "@/lib/youversion/oauth";
import { useToast } from "@/hooks/use-toast";

export default function YouVersionCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const returnTo = state || getPKCEReturnTo() || "/board";

    if (!code) {
      toast({
        title: "Connection cancelled",
        description: "YouVersion authorization was not completed.",
        variant: "destructive",
      });
      navigate(returnTo, { replace: true });
      return;
    }

    (async () => {
      try {
        await exchangeYouVersionCode(code);
        toast({ title: "Connected to YouVersion ✓" });
      } catch (err) {
        console.error("[YouVersion] Token exchange failed:", err);
        toast({
          title: "Connection failed",
          description: "Could not connect to YouVersion. Please try again.",
          variant: "destructive",
        });
      } finally {
        navigate(returnTo, { replace: true });
      }
    })();
  }, [searchParams, navigate, toast]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: "linear-gradient(180deg, hsl(220 25% 8%) 0%, hsl(215 28% 12%) 100%)",
      }}
    >
      <SacredSpinner fullPage text="Connecting to YouVersion…" />
    </div>
  );
}
