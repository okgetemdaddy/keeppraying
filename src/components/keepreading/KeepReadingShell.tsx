import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useAuth } from "@/contexts/AuthContext";
import { KeepReadingHead } from "./KeepReadingHead";
import { SacredSpinner } from "@/components/SacredSpinner";
import Bible from "@/pages/Bible";
import KeepReadingAuth from "./KeepReadingAuth";
import ResetPassword from "@/pages/ResetPassword";
import KeepReadingLanding from "@/pages/KeepReadingLanding";

/**
 * Minimal app shell for the keepread.ing domain.
 * Unauthenticated → landing page. Authenticated → Bible reader.
 */
export function KeepReadingShell() {
  useActivityLogger();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <SacredSpinner />
      </div>
    );
  }

  return (
    <>
      <KeepReadingHead />
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={user ? <Bible /> : <KeepReadingLanding />} />
        <Route path="/auth" element={<KeepReadingAuth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
