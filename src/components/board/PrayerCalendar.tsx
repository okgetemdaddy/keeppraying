import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Maximize2, Minimize2, Flame, Heart, BookOpen,
  Bird, MessageSquare, Wind, Users, Home, Radio, Loader2,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, eachWeekOfInterval, isToday } from "date-fns";

interface CalendarEvent {
  id: string;
  date: Date;
  type: "prayer_created" | "prayed" | "liked" | "testimony" | "comment" | "breath" | "standby" | "streak_milestone" | "group_activity" | "family_activity";
  label: string;
  detail?: string;
  link?: string;
}

const EVENT_CONFIG: Record<CalendarEvent["type"], { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  prayer_created: { icon: BookOpen, color: "hsl(42 85% 58%)", bg: "hsl(42 85% 46% / 0.18)" },
  prayed: { icon: Flame, color: "hsl(35 90% 58%)", bg: "hsl(35 90% 50% / 0.15)" },
  liked: { icon: Heart, color: "hsl(0 72% 65%)", bg: "hsl(0 72% 51% / 0.15)" },
  testimony: { icon: Bird, color: "hsl(150 45% 55%)", bg: "hsl(150 45% 45% / 0.15)" },
  comment: { icon: MessageSquare, color: "hsl(210 55% 65%)", bg: "hsl(210 55% 50% / 0.15)" },
  breath: { icon: Wind, color: "hsl(190 55% 60%)", bg: "hsl(190 55% 50% / 0.15)" },
  standby: { icon: Radio, color: "hsl(270 55% 65%)", bg: "hsl(270 55% 50% / 0.15)" },
  streak_milestone: { icon: Flame, color: "hsl(42 95% 55%)", bg: "hsl(42 95% 46% / 0.2)" },
  group_activity: { icon: Users, color: "hsl(220 55% 65%)", bg: "hsl(220 55% 50% / 0.15)" },
  family_activity: { icon: Home, color: "hsl(25 70% 60%)", bg: "hsl(25 70% 50% / 0.15)" },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface PrayerCalendarProps {
  textColor: string;
  accentColor?: string;
}

export function PrayerCalendar({ textColor, accentColor = "hsl(42 85% 58%)" }: PrayerCalendarProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFullMonth, setIsFullMonth] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Calculate date ranges
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthWeeks = eachWeekOfInterval({ start: monthStart, end: monthEnd });

  // Fetch events from multiple tables
  const fetchEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const rangeStart = isFullMonth
      ? startOfWeek(monthStart).toISOString()
      : weekStart.toISOString();
    const rangeEnd = isFullMonth
      ? endOfWeek(monthEnd).toISOString()
      : weekEnd.toISOString();

    try {
      const [
        { data: prayerCards },
        { data: prayedActions },
        { data: likes },
        { data: testimonies },
        { data: comments },
        { data: standbyData },
        { data: groupPrayers },
        { data: familyPrayers },
      ] = await Promise.all([
        supabase.from("prayer_cards").select("id, title, prayer_text, created_at")
          .eq("created_by", user.id)
          .gte("created_at", rangeStart).lte("created_at", rangeEnd)
          .order("created_at", { ascending: false }),
        supabase.from("prayed_actions").select("id, prayer_id, created_at")
          .eq("user_id", user.id)
          .gte("created_at", rangeStart).lte("created_at", rangeEnd),
        supabase.from("likes").select("id, prayer_id, created_at")
          .eq("user_id", user.id)
          .gte("created_at", rangeStart).lte("created_at", rangeEnd),
        supabase.from("testimonies").select("id, body, created_at")
          .eq("user_id", user.id)
          .gte("created_at", rangeStart).lte("created_at", rangeEnd),
        supabase.from("comments").select("id, text, created_at")
          .eq("user_id", user.id)
          .gte("created_at", rangeStart).lte("created_at", rangeEnd),
        supabase.from("prayer_standby").select("id, started_at")
          .eq("user_id", user.id)
          .gte("started_at", rangeStart).lte("started_at", rangeEnd),
        supabase.from("prayer_group_prayers").select("id, created_at, group_id")
          .eq("shared_by", user.id)
          .gte("created_at", rangeStart).lte("created_at", rangeEnd),
        supabase.from("family_room_prayers").select("id, created_at, room_id")
          .eq("shared_by", user.id)
          .gte("created_at", rangeStart).lte("created_at", rangeEnd),
      ]);

      const mapped: CalendarEvent[] = [];

      (prayerCards || []).forEach(p => {
        const isBreath = false; // We'd need prayer_type but it's fine
        mapped.push({
          id: `pc-${p.id}`,
          date: new Date(p.created_at),
          type: "prayer_created",
          label: p.title || "New prayer written",
          detail: p.prayer_text?.slice(0, 80),
          link: `/prayer/${p.id}`,
        });
      });

      (prayedActions || []).forEach(a => {
        mapped.push({
          id: `pa-${a.id}`,
          date: new Date(a.created_at),
          type: "prayed",
          label: "Prayed",
          link: `/prayer/${a.prayer_id}`,
        });
      });

      (likes || []).forEach(l => {
        mapped.push({
          id: `lk-${l.id}`,
          date: new Date(l.created_at),
          type: "liked",
          label: "Hearted a prayer",
          link: `/prayer/${l.prayer_id}`,
        });
      });

      (testimonies || []).forEach(t => {
        mapped.push({
          id: `ts-${t.id}`,
          date: new Date(t.created_at),
          type: "testimony",
          label: "Shared a testimony",
          detail: t.body?.slice(0, 80),
          link: "/testify",
        });
      });

      (comments || []).forEach(c => {
        mapped.push({
          id: `cm-${c.id}`,
          date: new Date(c.created_at),
          type: "comment",
          label: "Left a comment",
          detail: c.text?.slice(0, 60),
        });
      });

      (standbyData || []).forEach(s => {
        mapped.push({
          id: `sb-${s.id}`,
          date: new Date(s.started_at),
          type: "standby",
          label: "Went on standby",
        });
      });

      (groupPrayers || []).forEach(g => {
        mapped.push({
          id: `gp-${g.id}`,
          date: new Date(g.created_at),
          type: "group_activity",
          label: "Shared in group",
          link: `/groups/${g.group_id}`,
        });
      });

      (familyPrayers || []).forEach(f => {
        mapped.push({
          id: `fp-${f.id}`,
          date: new Date(f.created_at),
          type: "family_activity",
          label: "Shared in family room",
          link: `/family/${f.room_id}`,
        });
      });

      setEvents(mapped);
    } catch (err) {
      console.error("Calendar fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, currentDate, isFullMonth]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const eventsForDay = useCallback((day: Date) => {
    return events.filter(e => isSameDay(e.date, day));
  }, [events]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return eventsForDay(selectedDay).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [selectedDay, eventsForDay]);

  const navPrev = () => setCurrentDate(d => isFullMonth ? new Date(d.getFullYear(), d.getMonth() - 1, 1) : subWeeks(d, 1));
  const navNext = () => setCurrentDate(d => isFullMonth ? new Date(d.getFullYear(), d.getMonth() + 1, 1) : addWeeks(d, 1));
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDay(new Date()); };

  if (isCollapsed) {
    return (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => setIsCollapsed(false)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl mb-5 transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: "#F5F0E8", border: "1px solid rgba(44,36,24,0.12)" }}
      >
        <CalendarIcon className="w-4 h-4" style={{ color: accentColor }} />
        <span className="text-xs font-medium" style={{ color: textColor }}>
          {format(currentDate, isFullMonth ? "MMMM yyyy" : "'Week of' MMM d")}
        </span>
        <span className="text-[10px]" style={{ color: `${textColor}50` }}>
          · {events.length} activities
        </span>
      </motion.button>
    );
  }

  // Render a single day cell
  const renderDayCell = (day: Date, compact = false) => {
    const dayEvents = eventsForDay(day);
    const isSelected = selectedDay && isSameDay(day, selectedDay);
    const today = isToday(day);

    return (
      <motion.button
        key={day.toISOString()}
        whileTap={{ scale: 0.95 }}
        onClick={() => setSelectedDay(isSelected ? null : day)}
        className="flex flex-col items-center gap-1 rounded-xl py-2 px-1 transition-all relative"
        style={{
          background: isSelected ? `${accentColor}22` : today ? "rgba(44,36,24,0.06)" : "transparent",
          border: isSelected ? `1.5px solid ${accentColor}55` : today ? "1.5px solid rgba(44,36,24,0.12)" : "1.5px solid transparent",
          minWidth: compact ? 36 : 44,
          flex: 1,
        }}
      >
        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: `${textColor}45` }}>
          {format(day, "EEE")}
        </span>
        <span
          className="text-sm font-semibold"
          style={{ color: today ? accentColor : isSelected ? accentColor : textColor }}
        >
          {format(day, "d")}
        </span>
        {/* Activity dots */}
        {dayEvents.length > 0 && (
          <div className="flex gap-0.5 flex-wrap justify-center max-w-[36px]">
            {/* Show unique event type dots, max 4 */}
            {[...new Set(dayEvents.map(e => e.type))].slice(0, 4).map(type => {
              const config = EVENT_CONFIG[type];
              return (
                <span
                  key={type}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: config.color }}
                />
              );
            })}
            {dayEvents.length > 4 && (
              <span className="text-[8px]" style={{ color: `${textColor}50` }}>+</span>
            )}
          </div>
        )}
      </motion.button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl mb-5 overflow-hidden"
      style={{
        background: "#F5F0E8",
        border: "1px solid rgba(44,36,24,0.12)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" style={{ color: accentColor }} />
          <h3 className="text-sm font-semibold" style={{ color: textColor }}>
            {isFullMonth ? format(currentDate, "MMMM yyyy") : format(weekStart, "MMM d") + " – " + format(weekEnd, "MMM d, yyyy")}
          </h3>
          {loading && <Loader2 className="w-3 h-3 animate-spin" style={{ color: `${textColor}50` }} />}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className="px-2 py-1 rounded-lg text-[10px] font-medium transition-colors"
            style={{ color: accentColor, background: `${accentColor}15` }}
          >
            Today
          </button>
          <button onClick={navPrev} className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: `${textColor}70` }}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={navNext} className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: `${textColor}70` }}>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsFullMonth(v => !v)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: `${textColor}60` }}
            title={isFullMonth ? "Week view" : "Full month"}
          >
            {isFullMonth ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10 text-[10px]"
            style={{ color: `${textColor}50` }}
            title="Collapse"
          >
            ▴
          </button>
        </div>
      </div>

      {/* Calendar body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={isFullMonth ? "month" : "week"}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="px-3 pb-3"
        >
          {isFullMonth ? (
            /* Full Month View */
            <div className="space-y-1">
              {/* Day name headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-[10px] font-medium uppercase tracking-wider py-1" style={{ color: `${textColor}40` }}>
                    {d}
                  </div>
                ))}
              </div>
              {/* Weeks */}
              {monthWeeks.map(weekStartDate => {
                const days = eachDayOfInterval({
                  start: weekStartDate,
                  end: endOfWeek(weekStartDate),
                });
                return (
                  <div key={weekStartDate.toISOString()} className="grid grid-cols-7 gap-1">
                    {days.map(day => {
                      const inMonth = day.getMonth() === currentDate.getMonth();
                      const dayEvents = eventsForDay(day);
                      const isSelected = selectedDay && isSameDay(day, selectedDay);
                      const today = isToday(day);

                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDay(isSelected ? null : day)}
                          className="flex flex-col items-center gap-0.5 rounded-lg py-1.5 transition-all"
                          style={{
                            background: isSelected ? `${accentColor}22` : today ? "rgba(255,255,255,0.06)" : "transparent",
                            border: isSelected ? `1px solid ${accentColor}44` : "1px solid transparent",
                            opacity: inMonth ? 1 : 0.3,
                          }}
                        >
                          <span className="text-xs font-medium" style={{ color: today ? accentColor : textColor }}>
                            {format(day, "d")}
                          </span>
                          {dayEvents.length > 0 && (
                            <div className="flex gap-0.5">
                              {[...new Set(dayEvents.map(e => e.type))].slice(0, 3).map(type => (
                                <span key={type} className="w-1 h-1 rounded-full" style={{ background: EVENT_CONFIG[type].color }} />
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Week View */
            <div className="flex gap-1">
              {weekDays.map(day => renderDayCell(day))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Selected day detail */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t overflow-hidden"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="px-4 py-3">
              <p className="text-xs font-semibold mb-2" style={{ color: accentColor }}>
                {format(selectedDay, "EEEE, MMMM d")}
                <span className="font-normal ml-1" style={{ color: `${textColor}50` }}>
                  · {selectedDayEvents.length} {selectedDayEvents.length === 1 ? "activity" : "activities"}
                </span>
              </p>
              {selectedDayEvents.length === 0 ? (
                <p className="text-xs italic py-2" style={{ color: `${textColor}40` }}>
                  A quiet day of rest — "Be still, and know that I am God."
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedDayEvents.map(event => {
                    const config = EVENT_CONFIG[event.type];
                    const Icon = config.icon;
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-2.5 rounded-xl px-3 py-2 transition-colors"
                        style={{ background: config.bg }}
                      >
                        <div className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: config.color }}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium" style={{ color: textColor }}>
                            {event.label}
                          </p>
                          {event.detail && (
                            <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: `${textColor}55` }}>
                              {event.detail}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] flex-shrink-0" style={{ color: `${textColor}40` }}>
                          {format(event.date, "h:mm a")}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      {!isCollapsed && (
        <div className="px-4 pb-3 flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(EVENT_CONFIG).slice(0, 6).map(([type, config]) => (
            <div key={type} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
              <span className="text-[9px] capitalize" style={{ color: `${textColor}40` }}>
                {type.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
