import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { encryptFile } from "@/lib/fileEncryption";
import {
  Shield, Lock, Cloud, ArrowRight, CheckCircle2, AlertTriangle,
  Upload as UploadIcon, FileText, Loader2, KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type PageState = "loading" | "expired" | "pin" | "upload" | "uploading" | "complete";

export default function Upload() {
  const [state, setState] = useState<PageState>("loading");
  const [error, setError] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [tokenId, setTokenId] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadToken, setUploadToken] = useState("");
  const [storagePath, setStoragePath] = useState("");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ─── Step 1: Extract token from hash and burn it ─────────────────────
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash || hash.length < 10) {
      setError("No access token found in this link.");
      setState("expired");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/burn-upload-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
          },
          body: JSON.stringify({ token: hash }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || "This link is no longer valid.");
          setState("expired");
          return;
        }
        setTokenId(data.token_id);
        setUploadUrl(data.upload_url);
        setUploadToken(data.upload_token);
        setStoragePath(data.storage_path);
        setState("pin");
      } catch {
        setError("Network error — please try again.");
        setState("expired");
      }
    })();
  }, []);

  // ─── PIN input handlers ──────────────────────────────────────────────
  const handlePinChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...pin];
    next[idx] = val;
    setPin(next);
    if (val && idx < 3) pinRefs.current[idx + 1]?.focus();
  };

  const handlePinKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[idx] && idx > 0) {
      pinRefs.current[idx - 1]?.focus();
    }
  };

  const pinComplete = pin.every((d) => d !== "");
  const pinValue = pin.join("");

  const confirmPin = () => {
    if (pinComplete) setState("upload");
  };

  // ─── Dropzone + Encrypt + Upload ─────────────────────────────────────
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      if (file.size > MAX_FILE_SIZE) {
        setError("File exceeds 100 MB limit.");
        return;
      }
      setFileName(file.name);
      setState("uploading");
      setProgress(10);

      try {
        // Encrypt
        setProgress(20);
        const { encryptedBlob, saltHex, ivHex } = await encryptFile(file, pinValue);
        setProgress(50);

        // Upload encrypted blob via signed URL
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: encryptedBlob,
        });

        if (!uploadRes.ok) throw new Error("Upload failed");
        setProgress(80);

        // Insert submission metadata with encryption details
        const { error: metaErr } = await supabase.from("admin_submissions").insert({
          token_id: tokenId,
          original_filename: file.name,
          stored_path: storagePath,
          file_size_bytes: file.size,
          encryption_iv: ivHex,
          encryption_salt: saltHex,
        } as any);

        if (metaErr) console.warn("Metadata insert warning:", metaErr);
          stored_path: storagePath,
          file_size_bytes: file.size,
          encryption_iv: ivHex,
          encryption_salt: saltHex,
        } as any);

        setProgress(100);
        setState("complete");
      } catch (err: any) {
        setError(err.message || "Upload failed. Please try again.");
        setState("upload");
      }
    },
    [pinValue, uploadUrl, uploadToken, storagePath, tokenId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    noClick: false,
    noKeyboard: false,
  });

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center p-4 md:p-8">
      <AnimatePresence mode="wait">
        {/* LOADING */}
        {state === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Validating secure link…</p>
          </motion.div>
        )}

        {/* EXPIRED / INVALID */}
        {state === "expired" && (
          <motion.div
            key="expired"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md text-center space-y-4"
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold">Link Expired</h1>
            <p className="text-muted-foreground text-sm">
              {error || "This upload link has been used or has expired. Please request a new one."}
            </p>
          </motion.div>
        )}

        {/* PIN ENTRY */}
        {state === "pin" && (
          <motion.div
            key="pin"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-sm w-full text-center space-y-8"
          >
            <div className="space-y-2">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <KeyRound className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-xl font-semibold">Enter Guest PIN</h1>
              <p className="text-sm text-muted-foreground">
                Enter the 4-digit PIN you were given to secure your upload.
              </p>
            </div>

            <div className="flex justify-center gap-3">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (pinRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  className="w-14 h-16 md:w-16 md:h-18 text-center text-2xl font-mono rounded-xl border-2 border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <Button
              onClick={confirmPin}
              disabled={!pinComplete}
              className="w-full h-12 text-base"
            >
              Continue
            </Button>
          </motion.div>
        )}

        {/* UPLOAD ZONE */}
        {state === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl w-full space-y-8"
          >
            {/* Hero */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Secure Portal
              </h1>
              <p className="text-muted-foreground text-sm">
                Kingdom Assets Ingress — encrypted before transmission
              </p>
            </div>

            {/* Visual flow diagram */}
            <div className="flex items-center justify-center gap-2 md:gap-4 py-4">
              <FlowStep icon={FileText} label="Raw File" />
              <ArrowRight className="h-5 w-5 text-primary animate-pulse shrink-0" />
              <FlowStep icon={Lock} label="AES-256" />
              <ArrowRight className="h-5 w-5 text-primary animate-pulse shrink-0" />
              <FlowStep icon={Cloud} label="Secure Vault" />
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-2xl p-8 md:p-12 text-center cursor-pointer
                transition-all duration-200
                ${isDragActive
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border hover:border-primary/50 hover:bg-accent/30"
                }
              `}
            >
              <input {...getInputProps()} />
              <UploadIcon className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-base font-medium">
                {isDragActive ? "Drop to encrypt & upload" : "Drag & drop a file, or tap to select"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Max 100 MB · Encrypted in your browser</p>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </motion.div>
        )}

        {/* UPLOADING */}
        {state === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-sm w-full text-center space-y-6"
          >
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <div className="space-y-1">
              <p className="font-medium">
                {progress < 50 ? "Encrypting…" : "Transmitting…"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{fileName}</p>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        )}

        {/* COMPLETE */}
        {state === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="max-w-sm text-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </motion.div>
            <h1 className="text-xl font-semibold">Securely Delivered</h1>
            <p className="text-sm text-muted-foreground">
              Your file has been encrypted and safely transmitted.
              <br />
              <span className="italic text-xs opacity-70">
                "The Lord is my rock, my fortress and my deliverer." — Psalm 18:2
              </span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FlowStep({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
        <Icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
      </div>
      <span className="text-[10px] md:text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}
