import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import SacredSpinner from "@/components/SacredSpinner";
import VerseLink from "@/components/VerseLink";

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface AuthGateProps {
  children: React.ReactNode;
  /** Page headline */
  title: string;
  /** Warm subtitle/description */
  subtitle: string;
  /** Icon for the hero circle */
  heroIcon: LucideIcon;
  /** Feature bullet points */
  features: FeatureItem[];
  /** Optional Scripture to display */
  verse?: string;
  verseRef?: string;
}

export default function AuthGate({
  children,
  title,
  subtitle,
  heroIcon: HeroIcon,
  features,
  verse,
  verseRef,
}: AuthGateProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <SacredSpinner fullPage />;
  }

  if (user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg w-full text-center space-y-8"
        >
          {/* Hero icon */}
          <div className="w-20 h-20 rounded-full bg-gradient-gold flex items-center justify-center mx-auto shadow-gold">
            <HeroIcon className="w-10 h-10 text-white" />
          </div>

          {/* Title & subtitle */}
          <div className="space-y-3">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              {title}
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3 text-left max-w-sm mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-card/80 border border-border/50"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="space-y-3 pt-2">
            <Button
              asChild
              size="lg"
              className="rounded-xl bg-gradient-gold text-white hover:opacity-90 shadow-gold px-8 text-base"
            >
              <Link to="/auth">
                <LogIn className="w-4 h-4 mr-2" />
                Sign Up Free
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/auth" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>

          {/* Verse */}
          {verse && verseRef && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="verse-text text-sm pt-4 text-muted-foreground italic"
            >
              "{verse}" <span className="not-italic">— <VerseLink reference={verseRef} text={verse} /></span>
            </motion.p>
          )}
          {verse && !verseRef && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="verse-text text-sm pt-4 text-muted-foreground italic"
            >
              "{verse}"
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
