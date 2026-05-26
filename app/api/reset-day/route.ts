import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = todayISO();
  const start = `${today}T00:00:00`;
  const end = `${today}T23:59:59`;

  await Promise.all([
    supabase.from("food_logs").delete().eq("user_id", user.id).gte("logged_at", start).lte("logged_at", end),
    supabase.from("water_logs").delete().eq("user_id", user.id).gte("logged_at", start).lte("logged_at", end),
    supabase.from("activity_logs").delete().eq("user_id", user.id).gte("logged_at", start).lte("logged_at", end),
  ]);

  return NextResponse.json({ ok: true });
}
