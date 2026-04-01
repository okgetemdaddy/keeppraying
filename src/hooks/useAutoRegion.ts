import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { detectUserRegion } from "@/lib/regionDetect";

/**
 * Auto-detects and persists a user's region to their profile.
 * Returns the current region (or null while loading).
 */
export function useAutoRegion() {
  const { user } = useAuth();
  const [region, setRegion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    let cancelled = false;

    (async () => {
      // Check if profile already has region
      const { data: profile } = await supabase
        .from("profiles")
        .select("region")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profile?.region) {
        setRegion(profile.region);
        setLoading(false);
        return;
      }

      // Auto-detect
      const detected = await detectUserRegion(user.id);
      if (cancelled) return;

      if (detected) {
        setRegion(detected);
        // Persist to profile
        await supabase
          .from("profiles")
          .update({ region: detected })
          .eq("id", user.id);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user]);

  return { region, loading };
}
