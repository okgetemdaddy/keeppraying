/**
 * DesignLab — Visual proof page for the ONE canonical prayer card.
 * Renders PrayerCardMobile with mock data so designers can verify
 * the exact component used across the entire app.
 */

import React from "react";
import { PrayerCardMobile } from "@/components/board/PrayerCardMobile";
import type { Database } from "@/integrations/supabase/types";

type PrayerCardRow = Database["public"]["Tables"]["prayer_cards"]["Row"];

const MOCK_PRAYER: PrayerCardRow = {
  id: "design-lab-mock",
  title: "A Prayer for Provision",
  prayer_text:
    "Lord, grant me the serenity to accept the things I cannot change, the courage to change the things I can, and the wisdom to know the difference. Let your light shine upon my path every single day.",
  prayer_type: "personal",
  status: "private",
  source: "user",
  created_by: "mock-user",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  likes_count: 0,
  prayed_count: 0,
  views: 0,
  audio_url: null,
  background_url: null,
  card_color: null,
  card_opacity: null,
  extended_prayer: JSON.stringify([
    { ref: "Isaiah 41:10", text: '"Fear not, for I am with you... I will uphold you with my righteous hand."' },
    { ref: "2 Timothy 1:7", text: '"For God has not given us a spirit of fear, but of power and of love and of a sound mind."' },
    { ref: "Philippians 4:6-7", text: '"Do not be anxious about anything, but in everything by prayer... let your requests be made known to God."' },
    { ref: "Psalm 27:1", text: '"The Lord is my light and my salvation; whom shall I fear?"' },
    { ref: "1 John 4:18", text: '"There is no fear in love, but perfect love casts out fear."' },
  ]),
  labels: null,
  meditation_essay: null,
  meditation_link: null,
  region: null,
  text_style: "Cormorant Garamond",
  voice_audio_url: null,
};

export default function DesignLab() {
  return (
    <div
      className="h-screen w-full flex flex-col items-center justify-center px-4 py-6 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 140% 80% at 50% 20%, #1e1a14 0%, #121010 50%, #0a0908 100%)",
      }}
    >
      <PrayerCardMobile
        prayer={MOCK_PRAYER}
        isOwner={true}
        userId="mock-user"
      />
    </div>
  );
}
