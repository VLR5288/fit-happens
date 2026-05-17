import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const today = todayISO();

  const [profileRes, foodRes, waterRes, activityRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase.from("food_logs").select("calories, protein_g, fibre_g").eq("user_id", user!.id)
      .gte("logged_at", `${today}T00:00:00`).lte("logged_at", `${today}T23:59:59`),
    supabase.from("water_logs").select("amount_ml").eq("user_id", user!.id)
      .gte("logged_at", `${today}T00:00:00`).lte("logged_at", `${today}T23:59:59`),
    supabase.from("activity_logs").select("duration_minutes, calories_burned").eq("user_id", user!.id)
      .gte("logged_at", `${today}T00:00:00`).lte("logged_at", `${today}T23:59:59`),
  ]);

  const profile = profileRes.data;
  const todayCalories = (foodRes.data ?? []).reduce((s, r) => s + (r.calories ?? 0), 0);
  const todayProtein = (foodRes.data ?? []).reduce((s, r) => s + (r.protein_g ?? 0), 0);
  const todayFibre = (foodRes.data ?? []).reduce((s, r) => s + (r.fibre_g ?? 0), 0);
  const todayWater = (waterRes.data ?? []).reduce((s, r) => s + r.amount_ml, 0);
  const todayActivityMin = (activityRes.data ?? []).reduce((s, r) => s + r.duration_minutes, 0);

  return (
    <DashboardClient
      profile={profile}
      todayCalories={Math.round(todayCalories)}
      todayProtein={Math.round(todayProtein)}
      todayFibre={Math.round(todayFibre)}
      todayWater={todayWater}
      todayActivityMin={todayActivityMin}
    />
  );
}
