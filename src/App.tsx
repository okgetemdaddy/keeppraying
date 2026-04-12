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
import Fruit from "./pages/Fruit";
import BibleCanvas from "./pages/BibleCanvas";
import SharedPrayerLanding from "./pages/SharedPrayerLanding";
import Profile from "./pages/Profile";
import Classical from "./pages/Classical";
import Help from "./pages/Help";
import Upload from "./pages/Upload";
import BoardV2 from "./pages/BoardV2";
import DesignLab from "./pages/DesignLab";
import ExploreMobile from "./pages/ExploreMobile";
import CirclesMobile from "./pages/CirclesMobile";
import ProfileMobile from "./pages/ProfileMobile";
import { UrgentPrayerNotifier } from "@/components/UrgentPrayerNotifier";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { PrayerFAB } from "@/components/PrayerFAB";
import { MobileTabBar } from "@/components/MobileTabBar";
import { MobileShell } from "@/components/MobileShell";
import { CommunityPrayerRequestModal } from "@/components/CommunityPrayerRequestModal";
import { TeamPrayerRequestModal } from "@/components/TeamPrayerRequestModal";
import { KeepReadingShell } from "@/components/keepreading/KeepReadingShell";
import { useIsMobile } from "@/hooks/use-mobile";

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

/** Pre-launch: redirect unauthenticated users to / for all non-essential routes */
function PreLaunchGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppShell() {
  const [communityOpen, setCommunityOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const isMobile = useIsMobile();
  useActivityLogger(); // auto-tracks page views & sessions

  const routeContent = (
    <Routes>
      <Route path="/" element={isMobile ? <Navigate to="/boardv2" replace /> : <Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/shared-prayer/:token" element={<SharedPrayerLanding />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

      {/* All other routes locked behind PreLaunchGuard */}
      <Route path="/prayers" element={<PreLaunchGuard><Prayers /></PreLaunchGuard>} />
      <Route path="/prayer/:id" element={<PreLaunchGuard><Prayer /></PreLaunchGuard>} />
      <Route path="/assistant" element={<PreLaunchGuard><PrayerAssist /></PreLaunchGuard>} />

      <Route path="/board" element={
        <PreLaunchGuard>
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
        </PreLaunchGuard>
      } />

      <Route path="/circles" element={
        <PreLaunchGuard>
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
        </PreLaunchGuard>
      } />
      <Route path="/circles/:id" element={
        <PreLaunchGuard>
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
        </PreLaunchGuard>
      } />

      <Route path="/groups" element={<Navigate to="/circles" replace />} />
      <Route path="/groups/:id" element={<Navigate to="/circles" replace />} />

      <Route path="/family" element={
        <PreLaunchGuard>
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
        </PreLaunchGuard>
      } />
      <Route path="/family/:id" element={
        <PreLaunchGuard>
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
        </PreLaunchGuard>
      } />

      <Route path="/profile" element={
        <PreLaunchGuard>
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
        </PreLaunchGuard>
      } />
      <Route path="/profile/:id" element={<PreLaunchGuard><Profile /></PreLaunchGuard>} />

      <Route path="/war-room" element={<PreLaunchGuard><WarRoom /></PreLaunchGuard>} />
      <Route path="/games" element={<PreLaunchGuard><Games /></PreLaunchGuard>} />
      <Route path="/blog" element={<PreLaunchGuard><Blog /></PreLaunchGuard>} />
      <Route path="/blog/:slug" element={<PreLaunchGuard><BlogPost /></PreLaunchGuard>} />
      <Route path="/testify" element={<PreLaunchGuard><Testify /></PreLaunchGuard>} />
      <Route path="/testimony/:id" element={<PreLaunchGuard><TestimonyDetail /></PreLaunchGuard>} />
      <Route path="/prayer-warriors" element={<PreLaunchGuard><PrayTheWorld /></PreLaunchGuard>} />
      <Route path="/we-pray" element={<Navigate to="/prayer-warriors" replace />} />
      <Route path="/pray-the-world" element={<Navigate to="/prayer-warriors" replace />} />
      <Route path="/sermon-sync" element={<PreLaunchGuard><SermonSync /></PreLaunchGuard>} />
      <Route path="/support" element={<PreLaunchGuard><Support /></PreLaunchGuard>} />
      <Route path="/breathe" element={<PreLaunchGuard><Breathe /></PreLaunchGuard>} />
      <Route path="/bible" element={<PreLaunchGuard><Bible /></PreLaunchGuard>} />
      <Route path="/Fruit" element={<PreLaunchGuard><Fruit /></PreLaunchGuard>} />
      <Route path="/classical" element={<PreLaunchGuard><Classical /></PreLaunchGuard>} />
      <Route path="/canvas" element={<PreLaunchGuard><BibleCanvas /></PreLaunchGuard>} />
      <Route path="/help" element={<PreLaunchGuard><Help /></PreLaunchGuard>} />
      <Route path="/boardv2" element={<PreLaunchGuard><BoardV2 /></PreLaunchGuard>} />
      <Route path="/design-lab" element={<PreLaunchGuard><DesignLab /></PreLaunchGuard>} />
      <Route path="/explore" element={<PreLaunchGuard><ExploreMobile /></PreLaunchGuard>} />
      <Route path="/circles-mobile" element={<PreLaunchGuard><CirclesMobile /></PreLaunchGuard>} />
      <Route path="/profile-mobile" element={<PreLaunchGuard><ProfileMobile /></PreLaunchGuard>} />
      <Route path="/invite/:type/:token" element={<InviteLanding />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  return (
    <>
      <Toaster />
      <Sonner />
      <UrgentPrayerNotifier />

      {isMobile ? (
        <MobileShell>
          {routeContent}
        </MobileShell>
      ) : (
        <>
          <MobileTabBar />
          <PrayerFAB
            onAskCommunity={() => setCommunityOpen(true)}
            onAskTeam={() => setTeamOpen(true)}
          />
          {routeContent}
        </>
      )}

      <CommunityPrayerRequestModal open={communityOpen} onOpenChange={setCommunityOpen} />
      <TeamPrayerRequestModal open={teamOpen} onOpenChange={setTeamOpen} />
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
