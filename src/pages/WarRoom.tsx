import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function WarRoom() {
  return (
    <div className="min-h-screen warroom-bg flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-lg">
        <div className="w-16 h-16 rounded-full bg-gradient-gold mx-auto animate-glow flex items-center justify-center shadow-gold">
          <span className="text-2xl">🕯️</span>
        </div>
        <h1 className="font-display text-4xl font-bold text-white">The War Room</h1>
        <p className="text-white/70 font-display italic text-lg">"Go into your room, close the door and pray to your Father who is unseen." — Matthew 6:6</p>
        <p className="text-white/50 text-sm">Your immersive focused prayer space — with ambient music, themes, and playlist builder — is coming soon.</p>
        <Link to="/prayers"><Button variant="outline" className="rounded-xl gap-2 border-white/20 text-white hover:bg-white/10"><ArrowLeft className="w-4 h-4" /> Back to Prayers</Button></Link>
      </div>
    </div>
  );
}
