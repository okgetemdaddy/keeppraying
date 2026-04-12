import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";
import VerseLink from "@/components/VerseLink";
import heroBg from "@/assets/hero-bg.jpg";

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setResetSent(true);
      } else if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        // Check for a post-login redirect intent
        const pendingRaw = sessionStorage.getItem("kp_post_login");
        if (pendingRaw) {
          sessionStorage.removeItem("kp_post_login");
          const pending = JSON.parse(pendingRaw) as { path: string };
        navigate(pending.path || "/board");
        } else {
          navigate("/board");
        }
      } else {
        const { error } = await signUp(email, password, name);
        if (error) throw error;
        toast({ title: "Welcome to KeepPray.ing 🙏", description: "Check your email to confirm your account." });
      }
    } catch (err: unknown) {
      toast({ title: "Something went wrong", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    setLoading(true);
    try {
      // Preserve post-login intent for OAuth (it survives the redirect via sessionStorage)
      const redirectUri = (() => {
        const pending = sessionStorage.getItem("kp_post_login");
        if (pending) {
          const { path } = JSON.parse(pending) as { path: string };
          return window.location.origin + path;
        }
        return window.location.origin;
      })();
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: redirectUri,
      });
      if (error) throw error;
    } catch (err: unknown) {
      toast({ title: "Something went wrong", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={heroBg} alt="Prayer" className="absolute inset-0 w-full h-full object-cover" />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-center">
          <Link to="/" className="font-display text-4xl font-bold text-white mb-4">KeepPray.ing</Link>
          <p className="text-white/80 text-lg max-w-xs font-display italic leading-relaxed">
            "But when you pray, go into your room, close the door and pray to your Father, who is unseen."
          </p>
          <p className="text-white/60 mt-3 text-sm">— <VerseLink reference="Matthew 6:6" className="[&_.verse-text]:text-white/60 [&>span]:bg-white/10 [&>span]:border-white/20" /></p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Link to="/" className="font-display text-3xl font-bold text-foreground">KeepPray.ing</Link>
            <p className="mt-2 text-muted-foreground">
              {mode === "forgot" ? "Reset your password." : mode === "signin" ? "Welcome back, beloved." : "Begin your prayer journey."}
            </p>
          </div>

          {mode !== "forgot" && (
            <div className="flex rounded-xl border border-border p-1 bg-muted">
              <button onClick={() => setMode("signin")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === "signin" ? "bg-card shadow-card text-foreground" : "text-muted-foreground"}`}>Sign In</button>
              <button onClick={() => setMode("signup")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === "signup" ? "bg-card shadow-card text-foreground" : "text-muted-foreground"}`}>Sign Up</button>
            </div>
          )}

          {mode === "forgot" ? (
            resetSent ? (
              <div className="rounded-xl border border-border bg-muted/50 p-6 text-center space-y-3">
                <p className="text-2xl">🙏</p>
                <p className="font-medium text-foreground">Check your inbox</p>
                <p className="text-sm text-muted-foreground">We've sent a password reset link to <strong>{email}</strong>. Click it to set a new password.</p>
                <button onClick={() => { setMode("signin"); setResetSent(false); }} className="text-primary text-sm font-medium hover:underline mt-2 block mx-auto">Back to Sign In</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="rounded-xl" />
                </div>
                 <Button type="submit" disabled={loading} className="w-full h-11 text-base rounded-xl font-semibold" style={{ background: "var(--kp-gold)", color: "var(--kp-bg-deep)" }}>
                   {loading ? "Sending…" : "Send Reset Link"}
                 </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <button type="button" onClick={() => setMode("signin")} className="text-primary font-medium hover:underline">Back to Sign In</button>
                </p>
              </form>
            )
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} className="rounded-xl" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && (
                      <button type="button" onClick={() => setMode("forgot")} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="rounded-xl" />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 text-base rounded-xl font-semibold" style={{ background: "var(--kp-gold)", color: "var(--kp-bg-deep)" }}>
                   {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
                 </Button>
              </form>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
              </div>

              <div className="space-y-3">
                <Button type="button" variant="outline" onClick={() => handleOAuthSignIn("google")} disabled={loading} className="w-full h-11 rounded-xl gap-3 text-sm font-medium">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </Button>
                <Button type="button" variant="outline" onClick={() => handleOAuthSignIn("apple")} disabled={loading} className="w-full h-11 rounded-xl gap-3 text-sm font-medium">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-foreground" aria-hidden="true">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.39.07 2.36.74 3.18.78 1.21-.24 2.37-.93 3.67-.84 1.58.13 2.77.74 3.55 1.9-3.27 1.98-2.65 5.87.6 7.1-.67 1.82-1.53 3.6-3 4.92zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-medium hover:underline">
                  {mode === "signin" ? "Sign Up" : "Sign In"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
