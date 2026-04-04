import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface StudySession {
  id: string;
  book_usfm: string;
  chapter_id: number;
  verse_start: number | null;
  verse_end: number | null;
  paper_width_px: number;
  paper_height_px: number;
  chars_per_line: number;
  line_spacing: string;
  margin_style: string;
  font_size_px: number;
  text_x: number;
  text_y: number;
  text_width_px: number;
  elapsed_seconds: number;
  status: string;
  camera_x: number;
  camera_y: number;
  camera_scale: number;
  camera_rotation: number;
  thumbnail_url: string | null;
  created_at: string;
  last_active_at: string;
}

export function useStudySessions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["study-sessions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("last_active_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as StudySession[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}
