import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Target day = 3 days from now
    const target = new Date();
    target.setDate(target.getDate() + 3);
    const targetDayNum = target.getDay(); // 0=Sun, 6=Sat
    const targetDayName = WEEKDAY_NAMES[targetDayNum];
    const targetDateStr = target.toISOString().split("T")[0];

    let inserted = 0;

    // ── Circles with schedules ──────────────────────────────────────
    const { data: circles } = await supabase
      .from("accountability_circles")
      .select("id, name, schedule")
      .not("schedule", "is", null);

    for (const circle of circles || []) {
      const sched = circle.schedule as any;
      if (!sched?.day) continue;
      if (sched.day.toLowerCase() !== targetDayName) continue;

      // Get members
      const { data: members } = await supabase
        .from("accountability_circle_members")
        .select("user_id")
        .eq("circle_id", circle.id);

      for (const member of members || []) {
        // Dedup: check if we already sent for this week
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", member.user_id)
          .eq("type", "meeting_reminder")
          .gte("created_at", new Date(Date.now() - 6 * 86400000).toISOString())
          .like("link", `/circles/${circle.id}`);

        if ((count || 0) > 0) continue;

        const timeStr = sched.time || "";
        const descStr = sched.description || "";
        const body = timeStr
          ? `${sched.day} at ${timeStr}${descStr ? " — " + descStr : ""}`
          : `${sched.day}${descStr ? " — " + descStr : ""}`;

        await supabase.from("notifications").insert({
          user_id: member.user_id,
          type: "meeting_reminder",
          title: `📅 ${circle.name} meets in 3 days`,
          body,
          link: `/circles/${circle.id}`,
          metadata: { meeting_date: targetDateStr, source: "circle" },
        });
        inserted++;
      }
    }

    // ── Family rooms with schedules ─────────────────────────────────
    const { data: rooms } = await supabase
      .from("family_rooms")
      .select("id, name, schedule")
      .not("schedule", "is", null);

    for (const room of rooms || []) {
      const sched = room.schedule as any;
      if (!sched?.day) continue;
      if (sched.day.toLowerCase() !== targetDayName) continue;

      const { data: members } = await supabase
        .from("family_room_members")
        .select("user_id")
        .eq("room_id", room.id);

      for (const member of members || []) {
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", member.user_id)
          .eq("type", "meeting_reminder")
          .gte("created_at", new Date(Date.now() - 6 * 86400000).toISOString())
          .like("link", `/family/${room.id}`);

        if ((count || 0) > 0) continue;

        const timeStr = sched.time || "";
        const descStr = sched.description || "";
        const body = timeStr
          ? `${sched.day} at ${timeStr}${descStr ? " — " + descStr : ""}`
          : `${sched.day}${descStr ? " — " + descStr : ""}`;

        await supabase.from("notifications").insert({
          user_id: member.user_id,
          type: "meeting_reminder",
          title: `📅 ${room.name} meets in 3 days`,
          body,
          link: `/family/${room.id}`,
          metadata: { meeting_date: targetDateStr, source: "family" },
        });
        inserted++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifications_sent: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Meeting reminders error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
