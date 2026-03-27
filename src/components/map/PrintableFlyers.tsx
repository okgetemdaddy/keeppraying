import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, QrCode, Church, Users, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode";

const FLYER_TEMPLATES = [
  {
    id: "church",
    icon: <Church className="w-6 h-6" />,
    title: "Church Invitation",
    description: "Share with your pastor or church leader to introduce KeepPray.ing to your congregation.",
    color: "hsl(42, 78%, 54%)",
  },
  {
    id: "group",
    icon: <Users className="w-6 h-6" />,
    title: "Small Group Flyer",
    description: "Perfect for Bible studies, prayer groups, and small group meetings.",
    color: "hsl(200, 60%, 55%)",
  },
  {
    id: "personal",
    icon: <Heart className="w-6 h-6" />,
    title: "Personal Invite Card",
    description: "A simple, beautiful card to share with friends and family.",
    color: "hsl(340, 60%, 55%)",
  },
];

function FlyerPreview({
  template,
}: {
  template: (typeof FLYER_TEMPLATES)[number];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const downloadFlyer = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#0c0f1a";
    ctx.fillRect(0, 0, 1200, 1600);

    // Decorative border
    ctx.strokeStyle = template.color;
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, 1120, 1520);

    // Title
    ctx.fillStyle = template.color;
    ctx.font = "bold 72px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("KeepPray.ing", 600, 200);

    // Subtitle
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "32px Georgia, serif";
    ctx.fillText("A Sacred Digital Prayer Closet", 600, 270);

    // Body text
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "28px sans-serif";
    const lines = [
      "Pray together with believers worldwide.",
      "Create and share prayers from the heart.",
      "AI-guided prayer companion — never writes prayers for you.",
      "Private family rooms & prayer groups.",
      "Track your prayer journey with streaks.",
      "Completely free to use.",
    ];
    lines.forEach((line, i) => {
      ctx.fillText(`✦ ${line}`, 600, 400 + i * 55);
    });

    // Generate real QR code
    try {
      const qrDataUrl = await QRCode.toDataURL("https://keeppray.ing", {
        width: 320,
        margin: 2,
        color: { dark: "#0c0f1a", light: "#FFFFFF" },
      });
      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => resolve();
      });

      // White background for QR
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillRect(400, 850, 400, 400);
      ctx.drawImage(qrImg, 440, 890, 320, 320);
    } catch {
      // Fallback: white box with text
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(400, 850, 400, 400);
      ctx.fillStyle = "#0c0f1a";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("keeppray.ing", 600, 1060);
    }

    ctx.fillStyle = "#0c0f1a";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("SCAN TO JOIN", 600, 1310);

    // URL
    ctx.fillStyle = template.color;
    ctx.font = "bold 36px sans-serif";
    ctx.fillText("keeppray.ing", 600, 1400);

    // Verse
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "italic 24px Georgia, serif";
    ctx.fillText('"Pray without ceasing." — 1 Thessalonians 5:17', 600, 1500);

    // Download
    const link = document.createElement("a");
    link.download = `keeppraying-${template.id}-flyer.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all"
      style={{ background: "hsla(220, 50%, 8%, 0.6)" }}
    >
      {/* Preview header */}
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${template.color}20`, color: template.color }}
          >
            {template.icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white/80">{template.title}</h3>
            <p className="text-xs text-white/40">{template.description}</p>
          </div>
        </div>

        {/* Mini preview */}
        <div
          className="rounded-xl p-4 mb-4 text-center"
          style={{
            background: "#0c0f1a",
            border: `2px solid ${template.color}40`,
          }}
        >
          <p className="font-display text-lg font-bold mb-1" style={{ color: template.color }}>
            KeepPray.ing
          </p>
          <p className="text-[10px] text-white/40 mb-3">A Sacred Digital Prayer Closet</p>
          <div
            className="w-16 h-16 mx-auto rounded-lg flex items-center justify-center mb-2"
            style={{ background: "rgba(255,255,255,0.85)" }}
          >
            <QrCode className="w-10 h-10 text-black/70" />
          </div>
          <p className="text-[9px] text-white/30">Scan to join</p>
        </div>

        <Button
          onClick={downloadFlyer}
          className="w-full rounded-xl gap-2"
          style={{ background: `${template.color}20`, color: template.color }}
          variant="ghost"
        >
          <Download className="w-4 h-4" /> Download Flyer (PNG)
        </Button>
      </div>
    </motion.div>
  );
}

export default function PrintableFlyers() {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="font-display text-xl font-bold text-white/70 mb-2">
          📄 Printable Flyers
        </h2>
        <p className="text-white/40 text-sm max-w-md mx-auto">
          Download and print these flyers to share KeepPray.ing with your church, 
          small group, or community. Each includes a QR code for easy access.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FLYER_TEMPLATES.map((template) => (
          <FlyerPreview key={template.id} template={template} />
        ))}
      </div>

      <div className="text-center py-4">
        <p className="text-white/30 text-xs">
          💡 Tip: Print on high-quality paper for best results. Share digitally via social media too!
        </p>
      </div>
    </div>
  );
}
