import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Church, MapPin, Phone, Mail, Clock, ChevronDown, ChevronUp, Play,
  Globe, RefreshCw, Heart, Users, ExternalLink, Facebook, Instagram, Youtube,
  Twitter, Music, Video, Sparkles, Star, Navigation, ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserChurch } from "@/hooks/useUserChurch";

interface MyChurchSectionProps {
  textColor: string;
}

function SocialIcon({ platform }: { platform: string }) {
  const s = platform.toLowerCase();
  if (s.includes("facebook")) return <Facebook className="w-3.5 h-3.5" />;
  if (s.includes("instagram")) return <Instagram className="w-3.5 h-3.5" />;
  if (s.includes("youtube")) return <Youtube className="w-3.5 h-3.5" />;
  if (s.includes("twitter") || s.includes("x.com")) return <Twitter className="w-3.5 h-3.5" />;
  if (s.includes("spotify")) return <Music className="w-3.5 h-3.5" />;
  if (s.includes("tiktok")) return <Video className="w-3.5 h-3.5" />;
  return <ExternalLink className="w-3.5 h-3.5" />;
}

/** Ensure hex has alpha channel for semi-transparent use */
function hexAlpha(hex: string | null | undefined, alpha: string): string {
  if (!hex) return `rgba(255,255,255,0.${alpha})`;
  const h = hex.replace("#", "");
  if (h.length === 3) {
    const [r, g, b] = h.split("").map(c => parseInt(c + c, 16));
    return `rgba(${r},${g},${b},0.${alpha})`;
  }
  if (h.length >= 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},0.${alpha})`;
  }
  return `rgba(255,255,255,0.${alpha})`;
}

export function MyChurchSection({ textColor }: MyChurchSectionProps) {
  const { church, announcements, loading, setupChurch, refreshChurch } = useUserChurch();
  const [expanded, setExpanded] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [churchName, setChurchName] = useState("");
  const [churchUrl, setChurchUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (loading) return null;

  const handleSetup = async () => {
    if (!churchName.trim()) return;
    setSaving(true);
    const result = await setupChurch(churchName.trim(), churchUrl.trim());
    setSaving(false);
    if (result) setSetupMode(false);
  };

  const handleRefresh = async () => {
    if (!church?.website_url) return;
    setRefreshing(true);
    await refreshChurch();
    setRefreshing(false);
  };

  const scraped = (church?.scraped_data || {}) as Record<string, any>;

  // ── Visual identity ──
  const palette = scraped.color_palette as Record<string, string> | null;
  const brandPrimary = palette?.primary || null;
  const brandSecondary = palette?.secondary || null;
  const brandAccent = palette?.accent || null;
  const brandBg = palette?.background || null;
  const brandText = palette?.text || null;
  const logoUrl = scraped.logo_url as string | null;
  const pastorImageUrl = scraped.pastor_image_url as string | null;
  const heroImageUrl = scraped.hero_image_url as string | null;
  const faviconUrl = scraped.favicon_url as string | null;
  const buildingPhotoUrl = scraped.building_photo_url as string | null;

  // Google Places data
  const googleMapsUrl = scraped.google_maps_url as string | null;
  const googleRating = scraped.google_rating as number | null;
  const googleReviewCount = scraped.google_review_count as number | null;
  const googlePhotos = Array.isArray(scraped.google_photos) ? scraped.google_photos as string[] : [];

  // Use brand colors when available, fallback to theme textColor
  const hasBrand = !!brandPrimary;
  const primaryColor = brandPrimary || textColor;
  const accentBg = hasBrand ? hexAlpha(brandPrimary, "12") : "rgba(255,255,255,0.08)";
  const subtleBg = hasBrand ? hexAlpha(brandPrimary, "06") : "rgba(255,255,255,0.05)";
  const cardBg = hasBrand ? hexAlpha(brandPrimary, "08") : "rgba(255,255,255,0.08)";
  const pillBg = hasBrand ? hexAlpha(brandPrimary, "15") : "rgba(255,255,255,0.12)";
  const socialBg = hasBrand ? hexAlpha(brandPrimary, "12") : "rgba(255,255,255,0.1)";
  const btnBg = hasBrand ? hexAlpha(brandPrimary, "18") : "rgba(255,255,255,0.08)";

  /* Data extraction */
  const rawServiceTimes = Array.isArray(scraped.service_times) ? scraped.service_times : [];
  const serviceTimes = rawServiceTimes.map((t: any) =>
    typeof t === "string" ? { label: t } : t
  );
  const events = Array.isArray(scraped.upcoming_events) ? scraped.upcoming_events : [];
  const socials = scraped.social_media && typeof scraped.social_media === "object" ? scraped.social_media : {};
  const socialEntries = Object.entries(socials).filter(([, v]) => v && typeof v === "string") as [string, string][];
  const ministries = Array.isArray(scraped.ministries) ? scraped.ministries : [];
  const uniqueFeatures = Array.isArray(scraped.unique_features) ? scraped.unique_features : [];
  const values = Array.isArray(scraped.values) ? scraped.values : [];
  const aboutUs = typeof scraped.about_us === "string" ? scraped.about_us : "";
  const missionStatement = typeof scraped.mission_statement === "string" ? scraped.mission_statement : "";
  const pastorName = scraped.pastor_name as string | null;
  const pastorTitle = scraped.pastor_title as string | null;
  const denomination = scraped.denomination as string | null;
  const givingUrl = scraped.giving_url as string | null;
  const liveStreamUrl = scraped.live_stream_url as string | null;

  // Hero: prefer website hero, fall back to Google building photo
  const displayHeroUrl = heroImageUrl || buildingPhotoUrl || null;

  const jumpToTimestamp = (videoId: string, seconds: number) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`, "_blank");
  };

  const labelStyle = { color: `${textColor}50` };
  const bodyStyle = { color: `${textColor}80` };
  const headStyle = { color: `${textColor}90` };
  const iconStyle = { color: hasBrand ? primaryColor : `${textColor}60` };

  return (
    <div className="mb-6">
      {/* ── Header with logo ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left mb-3"
      >
        {logoUrl || faviconUrl ? (
          <img
            src={logoUrl || faviconUrl || ""}
            alt=""
            className="w-5 h-5 rounded-md object-contain flex-shrink-0"
            style={{ background: brandBg || "rgba(255,255,255,0.1)" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <Church className="w-4 h-4" style={{ color: primaryColor }} />
        )}
        <h3 className="text-sm font-display font-bold flex-1" style={{ color: textColor }}>
          {church ? church.name : "My Church"}
        </h3>
        {church && (
          <button
            onClick={(e) => { e.stopPropagation(); handleRefresh(); }}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            title="Refresh church info"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} style={iconStyle} />
          </button>
        )}
        {expanded
          ? <ChevronUp className="w-4 h-4" style={{ color: `${textColor}60` }} />
          : <ChevronDown className="w-4 h-4" style={{ color: `${textColor}60` }} />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-3"
          >
            {/* ── Setup states ── */}
            {!church && !setupMode ? (
              <div className="rounded-2xl p-5 text-center space-y-3" style={{ background: cardBg, backdropFilter: "blur(8px)" }}>
                <Church className="w-10 h-10 mx-auto" style={{ color: `${textColor}50` }} />
                <p className="text-sm" style={bodyStyle}>
                  Connect your church to see service times, events, socials, ministries, and more.
                </p>
                <Button onClick={() => setSetupMode(true)} className="rounded-xl gap-2 btn-gold">
                  <Church className="w-4 h-4" /> Set Up My Church
                </Button>
              </div>
            ) : !church && setupMode ? (
              <div className="rounded-2xl p-5 space-y-3" style={{ background: cardBg, backdropFilter: "blur(8px)" }}>
                <Input
                  placeholder="Church name (e.g. Grace Community Church)"
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  className="rounded-xl bg-white/10 border-white/20 placeholder:text-white/40"
                  style={{ color: textColor }}
                />
                <Input
                  placeholder="Church website URL (optional)"
                  value={churchUrl}
                  onChange={(e) => setChurchUrl(e.target.value)}
                  className="rounded-xl bg-white/10 border-white/20 placeholder:text-white/40"
                  style={{ color: textColor }}
                />
                <div className="flex gap-2">
                  <Button onClick={handleSetup} disabled={saving || !churchName.trim()} className="rounded-xl gap-2 btn-gold flex-1">
                    {saving ? "Setting up…" : "Save Church"}
                  </Button>
                  <Button variant="ghost" onClick={() => setSetupMode(false)} className="rounded-xl" style={{ color: `${textColor}70` }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : church ? (
              <>
                {/* ── Hero Banner (if available) ── */}
                {heroImageUrl && (
                  <div className="rounded-2xl overflow-hidden relative" style={{ height: 120 }}>
                    <img
                      src={heroImageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                    />
                    <div className="absolute inset-0" style={{
                      background: `linear-gradient(to top, ${hexAlpha(brandPrimary || "#000000", "85")}, transparent 60%)`,
                    }} />
                    {/* Logo overlay on hero */}
                    {logoUrl && (
                      <div className="absolute bottom-2 left-3 flex items-center gap-2">
                        <img
                          src={logoUrl}
                          alt=""
                          className="w-8 h-8 rounded-lg object-contain shadow-lg"
                          style={{ background: "rgba(255,255,255,0.9)" }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ── About / Mission with Pastor ── */}
                {(aboutUs || missionStatement || pastorName) && (
                  <div className="rounded-2xl p-4 space-y-3" style={{ background: cardBg, backdropFilter: "blur(8px)" }}>
                    {/* Pastor card */}
                    {pastorName && (
                      <div className="flex items-center gap-3">
                        {pastorImageUrl ? (
                          <img
                            src={pastorImageUrl}
                            alt={pastorName}
                            className="w-10 h-10 rounded-full object-cover border-2 flex-shrink-0"
                            style={{ borderColor: primaryColor }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                            style={{ background: primaryColor }}
                          >
                            {pastorName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold" style={headStyle}>{pastorName}</p>
                          <p className="text-[10px]" style={labelStyle}>
                            {pastorTitle || "Pastor"}
                            {denomination && <span> · {denomination}</span>}
                          </p>
                        </div>
                      </div>
                    )}

                    {!pastorName && denomination && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full inline-block" style={{ background: pillBg, ...bodyStyle }}>
                        {denomination}
                      </span>
                    )}

                    {aboutUs && (
                      <p className="text-xs leading-relaxed italic" style={bodyStyle}>"{aboutUs}"</p>
                    )}
                    {missionStatement && missionStatement !== aboutUs && (
                      <p className="text-[10px] leading-relaxed" style={labelStyle}>
                        <strong>Mission:</strong> {missionStatement}
                      </p>
                    )}
                  </div>
                )}

                {/* ── Contact & Details ── */}
                <div className="rounded-2xl p-4 space-y-2" style={{ background: cardBg, backdropFilter: "blur(8px)" }}>
                  {church.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={iconStyle} />
                      <p className="text-xs" style={bodyStyle}>{church.address}</p>
                    </div>
                  )}
                  {church.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" style={iconStyle} />
                      <a href={`tel:${church.phone}`} className="text-xs underline" style={bodyStyle}>{church.phone}</a>
                    </div>
                  )}
                  {church.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" style={iconStyle} />
                      <a href={`mailto:${church.email}`} className="text-xs underline" style={bodyStyle}>{church.email}</a>
                    </div>
                  )}
                  {church.website_url && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 flex-shrink-0" style={iconStyle} />
                      <a href={church.website_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs underline" style={bodyStyle}>
                        {church.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    </div>
                  )}
                </div>

                {/* ── Service Times ── */}
                {serviceTimes.length > 0 && (
                  <div className="rounded-2xl p-4 space-y-2" style={{ background: subtleBg, backdropFilter: "blur(8px)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: hasBrand ? primaryColor : `${textColor}50` }}>
                      <Clock className="w-3 h-3" /> Service Times
                    </p>
                    <div className="space-y-1.5">
                      {serviceTimes.map((t: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: primaryColor }} />
                          <span className="text-xs" style={headStyle}>
                            {t.day && <span className="font-medium">{t.day} </span>}
                            {t.time && <span>{t.time} </span>}
                            {t.label && <span style={labelStyle}>— {t.label}</span>}
                            {!t.day && !t.time && t.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Social Media ── */}
                {socialEntries.length > 0 && (
                  <div className="rounded-2xl p-4" style={{ background: subtleBg, backdropFilter: "blur(8px)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: hasBrand ? primaryColor : `${textColor}50` }}>
                      Connect
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {socialEntries.map(([platform, url]) => (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full transition-all hover:scale-105"
                          style={{ background: socialBg, color: hasBrand ? primaryColor : `${textColor}80` }}
                        >
                          <SocialIcon platform={platform} />
                          <span className="capitalize">{platform}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Quick Links (Giving / Live Stream) ── */}
                {(givingUrl || liveStreamUrl) && (
                  <div className="flex gap-2">
                    {givingUrl && (
                      <a href={givingUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold px-3 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
                        style={{ background: btnBg, color: hasBrand ? primaryColor : textColor }}>
                        <Heart className="w-3.5 h-3.5" /> Give Online
                      </a>
                    )}
                    {liveStreamUrl && (
                      <a href={liveStreamUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold px-3 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
                        style={{ background: btnBg, color: hasBrand ? primaryColor : textColor }}>
                        <Video className="w-3.5 h-3.5" /> Live Stream
                      </a>
                    )}
                  </div>
                )}

                {/* ── Ministries ── */}
                {ministries.length > 0 && (
                  <div className="rounded-2xl p-4 space-y-2" style={{ background: subtleBg, backdropFilter: "blur(8px)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: hasBrand ? primaryColor : `${textColor}50` }}>
                      <Users className="w-3 h-3" /> Ministries
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {ministries.map((m: any, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: pillBg, color: hasBrand ? primaryColor : `${textColor}80` }}
                          title={m.description || ""}>
                          {m.name || m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Values ── */}
                {values.length > 0 && (
                  <div className="rounded-2xl p-4 space-y-2" style={{ background: subtleBg, backdropFilter: "blur(8px)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: hasBrand ? primaryColor : `${textColor}50` }}>
                      <Star className="w-3 h-3" /> Core Values
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {values.map((v: string, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: pillBg, color: hasBrand ? primaryColor : `${textColor}80` }}>
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Unique Features ── */}
                {uniqueFeatures.length > 0 && (
                  <div className="rounded-2xl p-4 space-y-2" style={{ background: subtleBg, backdropFilter: "blur(8px)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: hasBrand ? primaryColor : `${textColor}50` }}>
                      <Sparkles className="w-3 h-3" /> What Makes Us Unique
                    </p>
                    {uniqueFeatures.map((f: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: primaryColor }} />
                        <p className="text-xs" style={bodyStyle}>{f}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Events ── */}
                {events.length > 0 && (
                  <div className="rounded-2xl p-4 space-y-2" style={{ background: subtleBg, backdropFilter: "blur(8px)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: hasBrand ? primaryColor : `${textColor}50` }}>
                      Upcoming Events
                    </p>
                    {events.slice(0, 6).map((evt: any, i: number) => (
                      <div key={i} className="space-y-0.5">
                        <p className="text-xs font-medium" style={headStyle}>{evt.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {evt.date && <span className="text-[10px]" style={labelStyle}>{evt.date}</span>}
                          {evt.time && <span className="text-[10px]" style={labelStyle}>@ {evt.time}</span>}
                        </div>
                        {evt.description && (
                          <p className="text-[10px] leading-relaxed" style={{ color: `${textColor}60` }}>
                            {evt.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Sermon Announcements ── */}
                {announcements.length > 0 && (
                  <div className="rounded-2xl p-4 space-y-2" style={{ background: subtleBg, backdropFilter: "blur(8px)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={labelStyle}>
                      Sermon Announcements
                    </p>
                    {announcements.slice(0, 8).map((ann) => (
                      <div key={ann.id} className="space-y-0.5">
                        <p className="text-xs" style={bodyStyle}>{ann.announcement_text}</p>
                        <div className="flex items-center gap-2">
                          {ann.video_title && (
                            <p className="text-[10px] truncate" style={{ color: `${textColor}40` }}>
                              {ann.video_title}
                            </p>
                          )}
                          {ann.timestamp_seconds != null && (
                            <button
                              onClick={() => jumpToTimestamp(ann.video_id, ann.timestamp_seconds!)}
                              className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: "rgba(239,68,68,0.15)", color: "rgb(239,68,68)" }}
                            >
                              <Play className="w-2 h-2" /> Jump to
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
