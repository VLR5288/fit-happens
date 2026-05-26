"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProgressRing from "@/components/ui/ProgressRing";
import type { Profile } from "@/lib/supabase/types";

// Defined locally to avoid importing from a server component file
interface DayData {
  date: string;
  dayLabel: string;
  calories: number;
  protein_g: number;
  fibre_g: number;
  water_ml: number;
}

interface TodayMeal {
  id: string;
  logged_at: string;
  meal_type: string;
  calories: number | null;
  foods: string[];
}

interface Props {
  profile: Profile | null;
  todayCalories: number;
  todayProtein: number;
  todayFibre: number;
  todayWater: number;
  todayActivityMin: number;
  weeklyData: DayData[];
  todayMeals: TodayMeal[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function foodSummary(foods: string[]): string {
  if (foods.length === 0) return "Meal";
  if (foods.length <= 3) return foods.join(", ");
  return foods.slice(0, 3).join(", ") + ` & ${foods.length - 3} more`;
}

export default function DashboardClient({
  profile,
  todayCalories,
  todayProtein,
  todayFibre,
  todayWater,
  todayActivityMin,
  weeklyData,
  todayMeals,
}: Props) {
  const router = useRouter();
  const [greeting, setGreeting] = useState("Good day");
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const calorieTarget = profile?.calorie_target ?? 2000;
  const proteinTarget = profile?.protein_target_g ?? 120;
  const fibreTarget = profile?.fibre_target_g ?? 30;
  const waterTarget = profile?.water_target_ml ?? 2500;

  async function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    setResetting(true);
    await fetch("/api/reset-day", { method: "POST" });
    setResetting(false);
    setConfirmReset(false);
    router.refresh();
  }

  const stats = [
    { label: "Calories", value: todayCalories, max: calorieTarget, unit: "kcal", color: "#f59e0b", href: "/log/food" },
    { label: "Protein",  value: todayProtein,  max: proteinTarget,  unit: "g",    color: "#8b5cf6", href: "/log/food" },
    { label: "Fibre",    value: todayFibre,    max: fibreTarget,    unit: "g",    color: "#06b6d4", href: "/log/food" },
    { label: "Water",    value: todayWater,    max: waterTarget,    unit: "ml",   color: "#3b82f6", href: "/log/water" },
  ];

  const weekMetrics = [
    { label: "Cal", key: "calories"  as const, target: calorieTarget, color: "bg-amber-400"  },
    { label: "Pro", key: "protein_g" as const, target: proteinTarget,  color: "bg-purple-400" },
    { label: "Fib", key: "fibre_g"   as const, target: fibreTarget,    color: "bg-cyan-400"   },
    { label: "Wat", key: "water_ml"  as const, target: waterTarget,    color: "bg-blue-400"   },
  ];

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">{greeting}</p>
          <h1 className="text-xl font-bold text-slate-100">
            {profile?.display_name ?? "Athlete"}
          </h1>
        </div>
        <Link href="/profile" className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg">
          👤
        </Link>
      </div>

      {/* Today's progress rings */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
          Today&apos;s progress
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <Link key={s.label} href={s.href} className="flex flex-col items-center">
              <ProgressRing
                value={s.value}
                max={s.max}
                size={72}
                strokeWidth={7}
                color={s.color}
                label={`${s.value}`}
              />
              <span className="text-xs text-slate-400 mt-1">{s.label}</span>
              <span className="text-xs text-slate-500">{s.max}{s.unit}</span>
            </Link>
          ))}
        </div>

        {/* Start New Day */}
        <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-end">
          <button
            onClick={handleReset}
            disabled={resetting}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
              confirmReset
                ? "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
                : "bg-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-600"
            }`}
          >
            {resetting ? "Resetting..." : confirmReset ? "Tap again to confirm" : "Start New Day"}
          </button>
        </div>
      </div>

      {/* Today's meals */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Today&apos;s meals</h2>

        {todayMeals.length === 0 ? (
          <Link
            href="/log/food"
            className="flex items-center gap-3 py-1 group"
          >
            <span className="text-2xl">🍽️</span>
            <div>
              <p className="text-sm text-slate-300 group-hover:text-emerald-400 transition-colors">No meals logged yet</p>
              <p className="text-xs text-slate-500">Tap to log your first meal today</p>
            </div>
            <span className="ml-auto text-slate-600 group-hover:text-emerald-500 transition-colors">→</span>
          </Link>
        ) : (
          <>
            <div className="space-y-3">
              {todayMeals.map((meal) => (
                <div key={meal.id} className="flex items-start gap-3">
                  <span className="text-xs text-slate-500 mt-0.5 w-16 shrink-0 tabular-nums">
                    {formatTime(meal.logged_at)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 capitalize">{meal.meal_type}</p>
                    <p className="text-xs text-slate-400 truncate">{foodSummary(meal.foods)}</p>
                  </div>
                  <span className="text-sm font-semibold text-amber-400 shrink-0">
                    {meal.calories ?? 0} kcal
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/log/food"
              className="block text-center text-xs text-emerald-400 hover:text-emerald-300 font-medium pt-1"
            >
              + Log another meal
            </Link>
          </>
        )}
      </div>

      {/* 7-day summary */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">7-day summary</h2>

        {weekMetrics.map((metric) => (
          <div key={metric.key} className="flex items-center gap-2">
            <span className="w-7 text-xs text-slate-500 shrink-0">{metric.label}</span>
            <div className="flex-1 flex items-end gap-1" style={{ height: "36px" }}>
              {weeklyData.map((day) => {
                const val = day[metric.key] ?? 0;
                const pct = metric.target > 0 ? Math.min(val / metric.target, 1) : 0;
                const barHeight = val > 0 ? Math.max(pct * 36, 4) : 2;
                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col justify-end h-full"
                    title={`${day.dayLabel}: ${Math.round(val)}`}
                  >
                    <div
                      className={`w-full rounded-sm ${metric.color} ${val > 0 ? "opacity-80" : "opacity-15"}`}
                      style={{ height: `${barHeight}px` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Day labels */}
        <div className="flex gap-1 pl-9">
          {weeklyData.map((day) => (
            <div key={day.date} className="flex-1 text-center text-[10px] text-slate-500">
              {day.dayLabel}
            </div>
          ))}
        </div>
      </div>

      {/* Activity summary */}
      <div className="card flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">Activity today</p>
          <p className="text-2xl font-bold text-slate-100">
            {todayActivityMin} <span className="text-sm font-normal text-slate-400">min</span>
          </p>
        </div>
        <Link
          href="/log/activity"
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          + Log
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/log/food" className="card flex items-center gap-3 hover:border-emerald-500 transition-colors">
          <span className="text-2xl">🍽️</span>
          <span className="text-sm font-medium">Log meal</span>
        </Link>
        <Link href="/log/water" className="card flex items-center gap-3 hover:border-emerald-500 transition-colors">
          <span className="text-2xl">💧</span>
          <span className="text-sm font-medium">Add water</span>
        </Link>
        <Link href="/log/meditation" className="card flex items-center gap-3 hover:border-emerald-500 transition-colors">
          <span className="text-2xl">🧘</span>
          <span className="text-sm font-medium">Meditate</span>
        </Link>
        <Link href="/log/notes" className="card flex items-center gap-3 hover:border-emerald-500 transition-colors">
          <span className="text-2xl">📓</span>
          <span className="text-sm font-medium">Daily note</span>
        </Link>
      </div>

      {/* Profile nudge if incomplete */}
      {!profile?.calorie_target && (
        <Link href="/profile" className="card border-amber-500/40 bg-amber-500/10 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-300">Set up your profile</p>
            <p className="text-xs text-slate-400">Add your stats to get personalised targets</p>
          </div>
        </Link>
      )}
    </div>
  );
}
