import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { isKeepReading } from "@/lib/hostDetect";
import { Capacitor } from "@capacitor/core";
import AuthGate from "@/components/AuthGate";
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
import TestimonyDetail from "./pages/TestimonyDetail";
import FamilyRooms from "./pages/FamilyRooms";
import FamilyRoomDetail from "./pages/FamilyRoomDetail";
import PrayTheWorld from "./pages/PrayTheWorld";
import SermonSync from "./pages/SermonSync";
import AccountabilityCircles from "./pages/AccountabilityCircles";
import CircleDetail from "./pages/CircleDetail";
import InviteLanding from "./pages/InviteLanding";
import Support from "./pages/Support";
import Breathe from "./pages/Breathe";
import Bible from "./pages/Bible";
import BibleCanvas from "./pages/BibleCanvas";
import SharedPrayerLanding from "./pages/SharedPrayerLanding";
import Profile from "./pages/Profile";
import { UrgentPrayerNotifier } from "@/components/UrgentPrayerNotifier";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { PrayerFAB } from "@/components/PrayerFAB";
import { MobileTabBar } from "@/components/MobileTabBar";
import { CommunityPrayerRequestModal } from "@/components/CommunityPrayerRequestModal";
import { TeamPrayerRequestModal } from "@/components/TeamPrayerRequestModal";
import { KeepReadingShell } from "@/components/keepreading/KeepReadingShell";

import {
  LayoutGrid, Users, Heart, Home, Shield, BookOpen,
  Sparkles, UserCircle, Flame
} from "lucide-react";

const queryClient = new QueryClient();
function PlatformAwareRouter({ children }: { children: React.ReactNode }) {
  return Capacitor.isNativePlatform()
    ? <HashRouter>{children}</HashRouter>
    : <BrowserRouter>{children}</BrowserRouter>;
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
  useActivityLogger(); // auto-tracks page views & sessions
  return (
    <>
      <Toaster />
      <Sonner />
      <UrgentPrayerNotifier />
      
      <MobileTabBar />
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

        {/* Prayer Board */}
        <Route path="/board" element={
          <AuthGate
            title="Your Prayer Board"
            subtitle="A sacred space to collect, organize, and revisit the prayers closest to your heart. Pin favorites, add notes, and watch God move."
            heroIcon={LayoutGrid}
            features={[
              { icon: LayoutGrid, title: "Organize Your Prayers", description: "Pin, resize, and arrange prayer cards in a layout that's uniquely yours." },
              { icon: Heart, title: "Track God's Faithfulness", description: "Mark prayers as answered, add personal notes, and build a living testimony." },
              { icon: Sparkles, title: "Assisted Prayers", description: "Let PrayerAssist help you put your heart into words, then save them here." },
              { icon: BookOpen, title: "Private & Personal", description: "Your board is your prayer closet — visible only to you and God." },
            ]}
            verse="But when you pray, go into your room, close the door and pray to your Father, who is unseen."
            verseRef="Matthew 6:6"
          >
            <Board />
          </AuthGate>
        } />

        {/* Circles (unified prayer groups + accountability) */}
        <Route path="/circles" element={
          <AuthGate
            title="Prayer Circles"
            subtitle="Gather with friends, small groups, and accountability partners. Share prayers, assign growth homework, and walk together in faith."
            heroIcon={Users}
            features={[
              { icon: Users, title: "Pray Together", description: "Create circles with friends, church members, or believers worldwide." },
              { icon: BookOpen, title: "Leader Tools", description: "Set schedules, assign homework, track engagement, and share invite links." },
              { icon: Shield, title: "Accountability & Growth", description: "Track streaks, share prayers, and encourage one another daily." },
              { icon: Sparkles, title: "Spiritual Encouragement", description: "Receive uplifting, Scripture-based encouragements for your circle." },
            ]}
            verse="For where two or three gather in my name, there am I with them."
            verseRef="Matthew 18:20"
          >
            <AccountabilityCircles />
          </AuthGate>
        } />
        <Route path="/circles/:id" element={
          <AuthGate
            title="Your Circle"
            subtitle="This is where community meets accountability — walking together in prayer and truth."
            heroIcon={Users}
            features={[
              { icon: Users, title: "Community Prayer", description: "See what others are praying and join in agreement." },
              { icon: Heart, title: "Encourage One Another", description: "Leave words of encouragement and share your journey." },
            ]}
            verse="Carry each other's burdens, and in this way you will fulfill the law of Christ."
            verseRef="Galatians 6:2"
          >
            <CircleDetail />
          </AuthGate>
        } />

        {/* Redirect old /groups to /circles */}
        <Route path="/groups" element={<Navigate to="/circles" replace />} />
        <Route path="/groups/:id" element={<Navigate to="/circles" replace />} />

        {/* Family Rooms */}
        <Route path="/family" element={
          <AuthGate
            title="Family Rooms"
            subtitle="Create a private prayer space for your family. Teach your children to pray, share requests, and grow in faith together."
            heroIcon={Home}
            features={[
              { icon: Home, title: "Family Prayer Space", description: "A warm, safe environment designed for families to pray together." },
              { icon: Heart, title: "Child-Friendly Mode", description: "Optional settings that make prayer approachable for young hearts." },
              { icon: Users, title: "Invite Family Members", description: "Share a magic invite link so everyone can join your family room." },
              { icon: BookOpen, title: "Leader Tools", description: "Set schedules, assign homework, and guide your family's prayer journey." },
            ]}
            verse="Train up a child in the way he should go; even when he is old he will not depart from it."
            verseRef="Proverbs 22:6"
          >
            <FamilyRooms />
          </AuthGate>
        } />
        <Route path="/family/:id" element={
          <AuthGate
            title="Family Room"
            subtitle="Your family's private prayer space — where hearts gather before God."
            heroIcon={Home}
            features={[
              { icon: Home, title: "Pray Together", description: "Share prayers and lift your family up before God." },
              { icon: Heart, title: "Stay Connected", description: "Even when apart, you're united in prayer." },
            ]}
            verse="As for me and my household, we will serve the Lord."
            verseRef="Joshua 24:15"
          >
            <FamilyRoomDetail />
          </AuthGate>
        } />

        {/* Profile */}
        <Route path="/profile" element={
          <AuthGate
            title="Your Faith Profile"
            subtitle="Track your prayer journey, view your streak, and see how God has been moving in your life."
            heroIcon={UserCircle}
            features={[
              { icon: Flame, title: "Prayer Streak", description: "See your daily prayer consistency and longest streak." },
              { icon: Heart, title: "Prayer History", description: "Review every prayer you've written and every answer received." },
              { icon: UserCircle, title: "Public or Private", description: "Choose whether to share your profile and encourage others." },
            ]}
            verse="Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up."
            verseRef="Galatians 6:9"
          >
            <Profile />
          </AuthGate>
        } />
        <Route path="/profile/:id" element={<Profile />} />

        <Route path="/war-room" element={<WarRoom />} />
        <Route path="/games" element={<Games />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="/testify" element={<Testify />} />
        <Route path="/testimony/:id" element={<TestimonyDetail />} />
        <Route path="/prayer-warriors" element={<PrayTheWorld />} />
        <Route path="/we-pray" element={<Navigate to="/prayer-warriors" replace />} />
        <Route path="/pray-the-world" element={<Navigate to="/prayer-warriors" replace />} />
        <Route path="/sermon-sync" element={<SermonSync />} />
        <Route path="/support" element={<Support />} />
        <Route path="/breathe" element={<Breathe />} />
        <Route path="/bible" element={<Bible />} />
        <Route path="/invite/:type/:token" element={<InviteLanding />} />
        <Route path="/shared-prayer/:token" element={<SharedPrayerLanding />} />
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
        <PlatformAwareRouter>
          {isKeepReading() ? <KeepReadingShell /> : <AppShell />}
        </PlatformAwareRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
