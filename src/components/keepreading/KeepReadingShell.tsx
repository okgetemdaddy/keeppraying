import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { KeepReadingHead } from "./KeepReadingHead";
import Bible from "@/pages/Bible";
import KeepReadingAuth from "./KeepReadingAuth";
import ResetPassword from "@/pages/ResetPassword";

/**
 * Minimal app shell for the keepread.ing domain.
 * Only Bible reader, auth, and password reset — no prayer features.
 */
export function KeepReadingShell() {
  useActivityLogger();

  return (
    <>
      <KeepReadingHead />
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Bible />} />
        <Route path="/auth" element={<KeepReadingAuth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Everything else → back to Bible */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
