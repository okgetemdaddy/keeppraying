import { supabase } from "@/integrations/supabase/client";

/** Region centers (lat/lng) for mapping coordinates to named regions */
const REGION_LAT_LNG: Record<string, { lat: number; lng: number }> = {
  "North America": { lat: 40, lng: -100 },
  "South America": { lat: -15, lng: -60 },
  "Europe": { lat: 50, lng: 10 },
  "Africa": { lat: 5, lng: 20 },
  "Middle East": { lat: 30, lng: 45 },
  "Central Asia": { lat: 45, lng: 65 },
  "East Asia": { lat: 35, lng: 115 },
  "South Asia": { lat: 20, lng: 78 },
  "Southeast Asia": { lat: 5, lng: 110 },
  "Oceania": { lat: -25, lng: 135 },
  "Caribbean": { lat: 18, lng: -72 },
  "Russia": { lat: 60, lng: 90 },
};

/** Maps lat/lng to nearest named region */
export function getNearestRegion(lat: number, lng: number): string {
  let nearest = "North America";
  let minDist = Infinity;
  for (const [name, coords] of Object.entries(REGION_LAT_LNG)) {
    const d = Math.sqrt((lat - coords.lat) ** 2 + (lng - coords.lng) ** 2);
    if (d < minDist) { minDist = d; nearest = name; }
  }
  return nearest;
}

/**
 * Attempt to detect a user's region from available data:
 * 1. Check user_churches scraped_data for lat/lng
 * 2. Fall back to browser geolocation
 * Returns the region string or null if undetectable.
 */
export async function detectUserRegion(userId: string): Promise<string | null> {
  try {
    // 1. Try church data first (most reliable)
    const { data: church } = await supabase
      .from("user_churches")
      .select("scraped_data, address")
      .eq("user_id", userId)
      .maybeSingle();

    if (church?.scraped_data) {
      const sd = church.scraped_data as Record<string, any>;
      if (sd.lat && sd.lng) {
        return getNearestRegion(Number(sd.lat), Number(sd.lng));
      }
      if (sd.latitude && sd.longitude) {
        return getNearestRegion(Number(sd.latitude), Number(sd.longitude));
      }
    }

    // 2. Browser geolocation fallback
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      return new Promise<string | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(getNearestRegion(pos.coords.latitude, pos.coords.longitude)),
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 6000 }
        );
      });
    }
  } catch {
    // Silent fail
  }
  return null;
}
