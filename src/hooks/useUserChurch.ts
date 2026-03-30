import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getLocalCache, setLocalCache, cacheKeys } from "@/lib/localCache";

interface Church {
  id: string;
  user_id: string;
  name: string;
  website_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  scraped_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface ChurchAnnouncement {
  id: string;
  user_id: string;
  church_id: string;
  video_id: string;
  video_title: string | null;
  announcement_text: string;
  timestamp_seconds: number | null;
  created_at: string;
}

export function useUserChurch() {
  const { user } = useAuth();
  const { toast } = useToast();
  const cached = user ? getLocalCache<{ church: Church | null; announcements: ChurchAnnouncement[] }>(cacheKeys.church(user.id)) : null;
  const [church, setChurch] = useState<Church | null>(cached?.church ?? null);
  const [announcements, setAnnouncements] = useState<ChurchAnnouncement[]>(cached?.announcements ?? []);
  const [loading, setLoading] = useState(!cached);

  const fetchChurch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from("user_churches")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      const churchData = data as Church | null;
      setChurch(churchData);

      let annData: ChurchAnnouncement[] = [];
      if (data) {
        const { data: ann } = await supabase
          .from("church_announcements")
          .select("*")
          .eq("user_id", user.id)
          .eq("church_id", data.id)
          .order("created_at", { ascending: false })
          .limit(20);
        annData = (ann || []) as ChurchAnnouncement[];
        setAnnouncements(annData);
      }
      setLocalCache(cacheKeys.church(user!.id), { church: churchData, announcements: annData });
    } catch (e) {
      console.error("Failed to fetch church:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchChurch(); }, [fetchChurch]);

  const setupChurch = async (name: string, websiteUrl: string) => {
    if (!user) return null;
    try {
      const resp = await supabase.functions.invoke("scrape-church-info", {
        body: { churchName: name, websiteUrl },
      });
      if (resp.error) throw new Error(resp.error.message);
      const result = resp.data;
      setChurch(result.church as Church);
      setLocalCache(cacheKeys.church(user.id), { church: result.church as Church, announcements });
      toast({ title: "My Church saved! ⛪", description: result.scraped ? "Church info has been populated from their website." : "Church saved." });
      return result.church as Church;
    } catch (e) {
      toast({ title: "Setup failed", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
      return null;
    }
  };

  /** Re-scrape the current church website to refresh all info */
  const refreshChurch = async () => {
    if (!user || !church?.website_url) return null;
    try {
      const resp = await supabase.functions.invoke("scrape-church-info", {
        body: { churchName: church.name, websiteUrl: church.website_url },
      });
      if (resp.error) throw new Error(resp.error.message);
      const result = resp.data;
      const updatedChurch = result.church as Church;
      setChurch(updatedChurch);
      setLocalCache(cacheKeys.church(user.id), { church: updatedChurch, announcements });
      toast({ title: "Church info refreshed! ⛪", description: "Latest details pulled from the website." });
      return updatedChurch;
    } catch (e) {
      toast({ title: "Refresh failed", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
      return null;
    }
  };

  const saveAnnouncements = async (
    items: { text: string; start: number }[],
    videoId: string,
    videoTitle: string,
  ) => {
    if (!user || !church) return;
    try {
      const rows = items.map((a) => ({
        user_id: user.id,
        church_id: church.id,
        video_id: videoId,
        video_title: videoTitle,
        announcement_text: a.text,
        timestamp_seconds: a.start,
      }));
      const { error } = await supabase.from("church_announcements").insert(rows);
      if (error) throw error;
      toast({ title: "Announcements saved! 📢" });
      fetchChurch();
    } catch (e) {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  return { church, announcements, loading, setupChurch, refreshChurch, saveAnnouncements, refetch: fetchChurch };
}
