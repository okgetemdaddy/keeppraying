import React, { useState, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { isKeepReading } from "@/lib/hostDetect";
import { Capacitor } from "@capacitor/core";
import AuthGate from "@/components/AuthGate";
import SacredSpinner from "@/components/SacredSpinner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Upload from "./pages/Upload";
import SharedPrayerLanding from "./pages/SharedPrayerLanding";
import InviteLanding from "./pages/InviteLanding";
import BoardV2 from "./pages/BoardV2";
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

// Lazy-loaded heavy pages
const Prayers = React.lazy(() => import("./pages/Prayers"));
const PrayerAssist = React.lazy(() => import("./pages/PrayerAssist"));
const Board = React.lazy(() => import("./pages/Board"));
const Admin = React.lazy(() => import("./pages/Admin"));
const Prayer = React.lazy(() => import("./pages/Prayer"));
const Testify = React.lazy(() => import("./pages/Testify"));
const TestimonyDetail = React.lazy(() => import("./pages/TestimonyDetail"));
const Support = React.lazy(() => import("./pages/Support"));
const Breathe = React.lazy(() => import("./pages/Breathe"));
const Bible = React.lazy(() => import("./pages/Bible"));
const Fruit = React.lazy(() => import("./pages/Fruit"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Classical = React.lazy(() => import("./pages/Classical"));
const Help = React.lazy(() => import("./pages/Help"));
const DesignLab = React.lazy(() => import("./pages/DesignLab"));
const AccountabilityCircles = React.lazy(() => import("./pages/AccountabilityCircles"));
const CircleDetail = React.lazy(() => import("./pages/CircleDetail"));

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
  useActivityLogger();

  const routeContent = (
    <Suspense fallback={<SacredSpinner />}>
      <Routes>
        <Route path="/" element={isMobile ? <Navigate to="/boardv2" replace /> : <Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/shared-prayer/:token" element={<SharedPrayerLanding />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

        {/* Core routes */}
        <Route path="/prayers" element={<PreLaunchGuard><Prayers /></PreLaunchGuard>} />
        <Route path="/prayer/:id" element={<PreLaunchGuard><Prayer /></PreLaunchGuard>} />
        <Route path="/assistant" element={<PreLaunchGuard><PrayerAssist /></PreLaunchGuard>} />

        <Route path="/board" element={
          <PreLaunchGuard>
            <AuthGate
              title="Your Prayer Board"
              subtitle="A sacred space to collect, organize, and revisit the prayers closest to your heart."
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
              subtitle="Gather with friends, small groups, and accountability partners."
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
              subtitle="This is where community meets accountability."
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

        <Route path="/profile" element={
          <PreLaunchGuard>
            <AuthGate
              title="Your Faith Profile"
              subtitle="Track your prayer journey, view your streak, and see how God has been moving."
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

        <Route path="/testify" element={<PreLaunchGuard><Testify /></PreLaunchGuard>} />
        <Route path="/testimony/:id" element={<PreLaunchGuard><TestimonyDetail /></PreLaunchGuard>} />
        <Route path="/support" element={<PreLaunchGuard><Support /></PreLaunchGuard>} />
        <Route path="/breathe" element={<PreLaunchGuard><Breathe /></PreLaunchGuard>} />
        <Route path="/bible" element={<PreLaunchGuard><Bible /></PreLaunchGuard>} />
        <Route path="/Fruit" element={<PreLaunchGuard><Fruit /></PreLaunchGuard>} />
        <Route path="/classical" element={<PreLaunchGuard><Classical /></PreLaunchGuard>} />
        <Route path="/help" element={<PreLaunchGuard><Help /></PreLaunchGuard>} />
        <Route path="/boardv2" element={<PreLaunchGuard><BoardV2 /></PreLaunchGuard>} />
        <Route path="/design-lab" element={<PreLaunchGuard><DesignLab /></PreLaunchGuard>} />
        <Route path="/explore" element={<PreLaunchGuard><ExploreMobile /></PreLaunchGuard>} />
        <Route path="/circles-mobile" element={<PreLaunchGuard><CirclesMobile /></PreLaunchGuard>} />
        <Route path="/profile-mobile" element={<PreLaunchGuard><ProfileMobile /></PreLaunchGuard>} />
        <Route path="/invite/:type/:token" element={<InviteLanding />} />

        {/* Delinked legacy routes — redirect to home */}
        <Route path="/games" element={<Navigate to="/" replace />} />
        <Route path="/blog" element={<Navigate to="/" replace />} />
        <Route path="/blog/:slug" element={<Navigate to="/" replace />} />
        <Route path="/war-room" element={<Navigate to="/" replace />} />
        <Route path="/prayer-warriors" element={<Navigate to="/" replace />} />
        <Route path="/we-pray" element={<Navigate to="/" replace />} />
        <Route path="/pray-the-world" element={<Navigate to="/" replace />} />
        <Route path="/sermon-sync" element={<Navigate to="/" replace />} />
        <Route path="/family" element={<Navigate to="/" replace />} />
        <Route path="/family/:id" element={<Navigate to="/" replace />} />
        <Route path="/canvas" element={<Navigate to="/" replace />} />
        <Route path="/groups" element={<Navigate to="/circles" replace />} />
        <Route path="/groups/:id" element={<Navigate to="/circles" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
