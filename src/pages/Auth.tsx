import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";
import heroBg from "@/assets/hero-bg.jpg";

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate("/prayers");
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
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
          <p className="text-white/60 mt-3 text-sm">— Matthew 6:6</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Link to="/" className="font-display text-3xl font-bold text-foreground">KeepPray.ing</Link>
            <p className="mt-2 text-muted-foreground">
              {mode === "signin" ? "Welcome back, beloved." : "Begin your prayer journey."}
            </p>
          </div>

          <div className="flex rounded-xl border border-border p-1 bg-muted">
            <button onClick={() => setMode("signin")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === "signin" ? "bg-card shadow-card text-foreground" : "text-muted-foreground"}`}>Sign In</button>
            <button onClick={() => setMode("signup")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === "signup" ? "bg-card shadow-card text-foreground" : "text-muted-foreground"}`}>Sign Up</button>
          </div>

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
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="rounded-xl" />
            </div>
            <Button type="submit" disabled={loading} className="w-full btn-gold h-11 text-base">
              {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-medium hover:underline">
              {mode === "signin" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
