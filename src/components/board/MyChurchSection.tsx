import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Church, MapPin, Phone, Mail, Clock, ChevronDown, ChevronUp, Play, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserChurch } from "@/hooks/useUserChurch";

interface MyChurchSectionProps {
  textColor: string;
}

export function MyChurchSection({ textColor }: MyChurchSectionProps) {
  const { church, announcements, loading, setupChurch } = useUserChurch();
  const [expanded, setExpanded] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [churchName, setChurchName] = useState("");
  const [churchUrl, setChurchUrl] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading) return null;

  const handleSetup = async () => {
    if (!churchName.trim()) return;
    setSaving(true);
    const result = await setupChurch(churchName.trim(), churchUrl.trim());
    setSaving(false);
    if (result) setSetupMode(false);
  };

  const scraped = church?.scraped_data || {};
  const serviceTimes = Array.isArray(scraped.service_times) ? scraped.service_times : [];
  const events = Array.isArray(scraped.upcoming_events) ? scraped.upcoming_events : [];

  const jumpToTimestamp = (videoId: string, seconds: number) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`, "_blank");
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left mb-3"
      >
        <Church className="w-4 h-4" style={{ color: textColor }} />
        <h3 className="text-sm font-display font-bold flex-1" style={{ color: textColor }}>
          {church ? church.name : "My Church"}
        </h3>
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
            {!church && !setupMode ? (
              <div
                className="rounded-2xl p-5 text-center space-y-3"
                style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}
              >
                <Church className="w-10 h-10 mx-auto" style={{ color: `${textColor}50` }} />
                <p className="text-sm" style={{ color: `${textColor}80` }}>
                  Connect your church to see announcements, service times, and contact info from synced sermons.
                </p>
                <Button
                  onClick={() => setSetupMode(true)}
                  className="rounded-xl gap-2 btn-gold"
                >
                  <Church className="w-4 h-4" /> Set Up My Church
                </Button>
              </div>
            ) : !church && setupMode ? (
              <div
                className="rounded-2xl p-5 space-y-3"
                style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}
              >
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
                  <Button
                    onClick={handleSetup}
                    disabled={saving || !churchName.trim()}
                    className="rounded-xl gap-2 btn-gold flex-1"
                  >
                    {saving ? "Setting up…" : "Save Church"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setSetupMode(false)}
                    className="rounded-xl"
                    style={{ color: `${textColor}70` }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : church ? (
              <>
                {/* Church info cards */}
                <div
                  className="rounded-2xl p-4 space-y-2"
                  style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}
                >
                  {church.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: `${textColor}60` }} />
                      <p className="text-xs" style={{ color: `${textColor}80` }}>{church.address}</p>
                    </div>
                  )}
                  {church.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `${textColor}60` }} />
                      <a href={`tel:${church.phone}`} className="text-xs underline" style={{ color: `${textColor}80` }}>{church.phone}</a>
                    </div>
                  )}
                  {church.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `${textColor}60` }} />
                      <a href={`mailto:${church.email}`} className="text-xs underline" style={{ color: `${textColor}80` }}>{church.email}</a>
                    </div>
                  )}
                  {church.website_url && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `${textColor}60` }} />
                      <a href={church.website_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs underline" style={{ color: `${textColor}80` }}>
                        {church.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    </div>
                  )}
                  {serviceTimes.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: `${textColor}60` }} />
                      <div className="flex flex-wrap gap-1.5">
                        {serviceTimes.map((t: string, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(255,255,255,0.12)", color: `${textColor}80` }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Events */}
                {events.length > 0 && (
                  <div
                    className="rounded-2xl p-4 space-y-2"
                    style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `${textColor}50` }}>
                      Upcoming Events
                    </p>
                    {events.slice(0, 5).map((evt: any, i: number) => (
                      <div key={i} className="space-y-0.5">
                        <p className="text-xs font-medium" style={{ color: `${textColor}90` }}>
                          {evt.name}
                        </p>
                        {evt.date && (
                          <p className="text-[10px]" style={{ color: `${textColor}50` }}>{evt.date}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Announcements from sermons */}
                {announcements.length > 0 && (
                  <div
                    className="rounded-2xl p-4 space-y-2"
                    style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `${textColor}50` }}>
                      Sermon Announcements
                    </p>
                    {announcements.slice(0, 8).map((ann) => (
                      <div key={ann.id} className="space-y-0.5">
                        <p className="text-xs" style={{ color: `${textColor}80` }}>{ann.announcement_text}</p>
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
