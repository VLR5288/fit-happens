import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export interface DayData {
  date: string;
  dayLabel: string;
  calories: number;
  protein_g: number;
  fibre_g: number;
  water_ml: number;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const today = todayISO();

  // Build 7-day window ending today
  const now = new Date();
  const weekDays: DayData[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    weekDays.push({
      date: d.toISOString().split("T")[0],
      dayLabel: d.toLocaleDateString("en-AU", { weekday: "short" }).slice(0, 3),
      calories: 0,
      protein_g: 0,
      fibre_g: 0,
      water_ml: 0,
    });
  }
  const weekStart = weekDays[0].date;

  const [profileRes, foodRes, waterRes, activityRes, weekFoodRes, weekWaterRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase.from("food_logs").select("calories, protein_g, fibre_g").eq("user_id", user!.id)
      .gte("logged_at", `${today}T00:00:00`).lte("logged_at", `${today}T23:59:59`),
    supabase.from("water_logs").select("amount_ml").eq("user_id", user!.id)
      .gte("logged_at", `${today}T00:00:00`).lte("logged_at", `${today}T23:59:59`),
    supabase.from("activity_logs").select("duration_minutes, calories_burned").eq("user_id", user!.id)
      .gte("logged_at", `${today}T00:00:00`).lte("logged_at", `${today}T23:59:59`),
    supabase.from("food_logs").select("logged_at, calories, protein_g, fibre_g").eq("user_id", user!.id)
      .gte("logged_at", `${weekStart}T00:00:00`).order("logged_at"),
    supabase.from("water_logs").select("logged_at, amount_ml").eq("user_id", user!.id)
      .gte("logged_at", `${weekStart}T00:00:00`).order("logged_at"),
  ]);

  const profile = profileRes.data;
  const todayCalories = (foodRes.data ?? []).reduce((s, r) => s + (r.calories ?? 0), 0);
  const todayProtein = (foodRes.data ?? []).reduce((s, r) => s + (r.protein_g ?? 0), 0);
  const todayFibre = (foodRes.data ?? []).reduce((s, r) => s + (r.fibre_g ?? 0), 0);
  const todayWater = (waterRes.data ?? []).reduce((s, r) => s + r.amount_ml, 0);
  const todayActivityMin = (activityRes.data ?? []).reduce((s, r) => s + r.duration_minutes, 0);

  // Aggregate weekly food data by day
  for (const row of weekFoodRes.data ?? []) {
    const date = (row.logged_at as string).split("T")[0];
    const day = weekDays.find((d) => d.date === date);
    if (day) {
      day.calories += row.calories ?? 0;
      day.protein_g += row.protein_g ?? 0;
      day.fibre_g += row.fibre_g ?? 0;
    }
  }
  for (const row of weekWaterRes.data ?? []) {
    const date = (row.logged_at as string).split("T")[0];
    const day = weekDays.find((d) => d.date === date);
    if (day) day.water_ml += row.amount_ml;
  }

  return (
    <DashboardClient
      profile={profile}
      todayCalories={Math.round(todayCalories)}
      todayProtein={Math.round(todayProtein)}
      todayFibre={Math.round(todayFibre)}
      todayWater={todayWater}
      todayActivityMin={todayActivityMin}
      weeklyData={weekDays}
    />
  );
}
