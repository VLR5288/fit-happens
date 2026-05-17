"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProgressRing from "@/components/ui/ProgressRing";
import type { Profile } from "@/lib/supabase/types";

interface Props {
  profile: Profile | null;
  todayCalories: number;
  todayProtein: number;
  todayFibre: number;
  todayWater: number;
  todayActivityMin: number;
}

export default function DashboardClient({
  profile,
  todayCalories,
  todayProtein,
  todayFibre,
  todayWater,
  todayActivityMin,
}: Props) {
  const [greeting, setGreeting] = useState("Good day");

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

  const stats = [
    {
      label: "Calories",
      value: todayCalories,
      max: calorieTarget,
      unit: "kcal",
      color: "#f59e0b",
      href: "/log/food",
    },
    {
      label: "Protein",
      value: todayProtein,
      max: proteinTarget,
      unit: "g",
      color: "#8b5cf6",
      href: "/log/food",
    },
    {
      label: "Fibre",
      value: todayFibre,
      max: fibreTarget,
      unit: "g",
      color: "#06b6d4",
      href: "/log/food",
    },
    {
      label: "Water",
      value: todayWater,
      max: waterTarget,
      unit: "ml",
      color: "#3b82f6",
      href: "/log/water",
    },
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

      {/* Progress rings */}
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
      </div>

      {/* Activity summary */}
      <div className="card flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">Activity today</p>
          <p className="text-2xl font-bold text-slate-100">{todayActivityMin} <span className="text-sm font-normal text-slate-400">min</span></p>
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
