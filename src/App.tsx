import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Prayers from "./pages/Prayers";
import PrayerAssist from "./pages/PrayerAssist";
import Board from "./pages/Board";
import WarRoom from "./pages/WarRoom";
import Games from "./pages/Games";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Admin from "./pages/Admin";
import Prayer from "./pages/Prayer";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Testify from "./pages/Testify";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import FamilyRooms from "./pages/FamilyRooms";
import FamilyRoomDetail from "./pages/FamilyRoomDetail";
import PrayTheWorld from "./pages/PrayTheWorld";
import SermonSync from "./pages/SermonSync";
import AccountabilityCircles from "./pages/AccountabilityCircles";
import CircleDetail from "./pages/CircleDetail";
import Support from "./pages/Support";
import Breathe from "./pages/Breathe";
import { UrgentPrayerNotifier } from "@/components/UrgentPrayerNotifier";
import { PrayerFAB } from "@/components/PrayerFAB";
import { CommunityPrayerRequestModal } from "@/components/CommunityPrayerRequestModal";
import { TeamPrayerRequestModal } from "@/components/TeamPrayerRequestModal";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        <p className="verse-text text-sm">Be still, and know…</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user || !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppShell() {
  const [communityOpen, setCommunityOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);

  return (
    <>
      <Toaster />
      <Sonner />
      <UrgentPrayerNotifier />
      <PrayerFAB
        onAskCommunity={() => setCommunityOpen(true)}
        onAskTeam={() => setTeamOpen(true)}
      />
      <CommunityPrayerRequestModal open={communityOpen} onOpenChange={setCommunityOpen} />
      <TeamPrayerRequestModal open={teamOpen} onOpenChange={setTeamOpen} />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/prayers" element={<Prayers />} />
        <Route path="/prayer/:id" element={<Prayer />} />
        <Route path="/assistant" element={<PrayerAssist />} />
        <Route path="/board" element={<ProtectedRoute><Board /></ProtectedRoute>} />
        <Route path="/war-room" element={<WarRoom />} />
        <Route path="/games" element={<Games />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="/testify" element={<Testify />} />
        <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
        <Route path="/groups/:id" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
        <Route path="/family" element={<ProtectedRoute><FamilyRooms /></ProtectedRoute>} />
        <Route path="/family/:id" element={<ProtectedRoute><FamilyRoomDetail /></ProtectedRoute>} />
        <Route path="/pray-the-world" element={<PrayTheWorld />} />
        <Route path="/sermon-sync" element={<SermonSync />} />
        <Route path="/circles" element={<ProtectedRoute><AccountabilityCircles /></ProtectedRoute>} />
        <Route path="/circles/:id" element={<ProtectedRoute><CircleDetail /></ProtectedRoute>} />
        <Route path="/support" element={<Support />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
