import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import {
  Link2, Copy, Check, Mail, MessageCircle, QrCode, Loader2,
  RefreshCw, Clock, Home, Users,
} from "lucide-react";

interface InviteShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "family" | "circle" | "sermon_plan";
  targetId: string;
  targetName: string;
}

export default function InviteShareModal({ open, onOpenChange, type, targetId, targetName }: InviteShareModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const baseUrl = window.location.origin;

  const generateToken = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invite_tokens")
        .insert({
          type,
          target_id: targetId,
          created_by: user.id,
        } as any)
        .select("token, expires_at")
        .single();

      if (error) throw error;
      setToken((data as any).token);
      setExpiresAt((data as any).expires_at);
    } catch {
      toast({ title: "Could not generate invite link", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !token && !loading) {
      generateToken();
    }
    if (!open) {
      setToken(null);
      setQrUrl(null);
      setShowQr(false);
      setCopied(false);
      setExpiresAt(null);
    }
  }, [open]);

  const inviteLink = token ? `${baseUrl}/invite/${type}/${token}` : "";

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({ title: "Invite link copied! 📋" });
    setTimeout(() => setCopied(false), 2500);
  };

  const generateQR = async () => {
    if (!inviteLink) return;
    try {
      const url = await QRCode.toDataURL(inviteLink, {
        width: 280,
        margin: 2,
        color: { dark: "#2C2418", light: "#FBF8F3" },
      });
      setQrUrl(url);
      setShowQr(true);
    } catch {
      toast({ title: "Could not generate QR code", variant: "destructive" });
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Join ${targetName} on KeepPray.ing`);
    const body = encodeURIComponent(
      `You're invited to join "${targetName}" — a ${type === "family" ? "Family Prayer Room" : "Prayer Circle"} on KeepPray.ing.\n\nClick here to join: ${inviteLink}\n\n"For where two or three gather in my name, there am I with them." — Matthew 18:20`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaSMS = () => {
    const text = encodeURIComponent(
      `You're invited to join "${targetName}" on KeepPray.ing 🙏\n\n${inviteLink}`
    );
    window.open(`sms:?body=${text}`);
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `You're invited to join "${targetName}" on KeepPray.ing 🙏\n\n${inviteLink}`
    );
    window.open(`https://wa.me/?text=${text}`);
  };

  const regenerate = async () => {
    setToken(null);
    setQrUrl(null);
    setShowQr(false);
    await generateToken();
  };

  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 7;

  const Icon = type === "family" ? Home : type === "sermon_plan" ? Users : Users;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            Invite to {targetName}
          </DialogTitle>
          <DialogDescription>
            Share this secure link to invite someone to your {type === "family" ? "family room" : "prayer circle"}.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : token ? (
          <div className="space-y-4 pt-1">
            {/* Link display */}
            <div className="rounded-xl p-3 bg-muted/60 border border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Magic Invite Link
              </p>
              <p className="text-xs text-foreground font-mono break-all leading-relaxed select-all">
                {inviteLink}
              </p>
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> Expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Primary action */}
            <Button onClick={copyLink} className="btn-gold rounded-xl gap-2 w-full h-11">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Invite Link"}
            </Button>

            {/* Share options */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={shareViaEmail}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors group"
              >
                <Mail className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] text-muted-foreground group-hover:text-foreground">Email</span>
              </button>
              <button
                onClick={shareViaSMS}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors group"
              >
                <MessageCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] text-muted-foreground group-hover:text-foreground">SMS</span>
              </button>
              <button
                onClick={shareViaWhatsApp}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors group"
              >
                <MessageCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] text-muted-foreground group-hover:text-foreground">WhatsApp</span>
              </button>
            </div>

            {/* QR Code */}
            {showQr && qrUrl ? (
              <div className="rounded-xl p-4 bg-muted/30 flex flex-col items-center gap-2">
                <img src={qrUrl} alt="QR Code" className="w-48 h-48 rounded-lg" />
                <p className="text-[10px] text-muted-foreground">Scan to join</p>
              </div>
            ) : (
              <Button variant="outline" onClick={generateQR} className="rounded-xl gap-2 w-full text-sm">
                <QrCode className="w-4 h-4" /> Show QR Code
              </Button>
            )}

            {/* Regenerate */}
            <button
              onClick={regenerate}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
            >
              <RefreshCw className="w-3 h-3" /> Generate new link
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">Could not generate link. Please try again.</p>
            <Button variant="outline" onClick={generateToken} className="rounded-xl mt-3 gap-2">
              <RefreshCw className="w-4 h-4" /> Retry
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
