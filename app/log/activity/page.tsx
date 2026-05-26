"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { INTENSITY_LEVELS } from "@/lib/constants";

const COMMON_ACTIVITIES = [
  "Walking", "Running", "Cycling", "Swimming", "Gym (weights)", "Yoga", "Pilates",
  "HIIT", "Rock climbing", "Tennis", "Football", "Basketball", "Dancing", "Hiking",
];

// MET values for standard activities (metabolic equivalent of task)
const MET_VALUES: Record<string, number> = {
  "Walking":        3.5,
  "Running":        9.8,
  "Cycling":        8.0,
  "Swimming":       6.0,
  "Gym (weights)":  3.5,
  "Yoga":           2.5,
  "Pilates":        3.0,
  "HIIT":           8.0,
  "Rock climbing":  8.0,
  "Tennis":         7.3,
  "Football":       8.0,
  "Basketball":     6.5,
  "Dancing":        5.0,
  "Hiking":         6.0,
};

const INTENSITY_MULTIPLIER: Record<string, number> = {
  low: 0.75,
  moderate: 1.0,
  high: 1.25,
};

function estimateBurn(
  activity: string,
  minutes: number,
  intensity: string,
  weightKg: number,
): number {
  if (minutes <= 0 || !activity.trim()) return 0;
  const key = Object.keys(MET_VALUES).find(
    (k) => k.toLowerCase() === activity.trim().toLowerCase(),
  );
  const baseMet = key ? MET_VALUES[key] : 4.0; // generic moderate activity fallback
  const met = baseMet * (INTENSITY_MULTIPLIER[intensity] ?? 1.0);
  return Math.round(met * weightKg * (minutes / 60));
}

export default function ActivityLogPage() {
  const router = useRouter();
  const [activityType, setActivityType] = useState("");
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState<string>("moderate");
  const [caloriesBurned, setCaloriesBurned] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedCalories, setSavedCalories] = useState(0);
  const [weightKg, setWeightKg] = useState(70);

  // Fetch user weight for more accurate MET calculation
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => { if (d?.weight_kg) setWeightKg(d.weight_kg); })
      .catch(() => null);
  }, []);

  // Auto-estimate calories whenever activity, duration, or intensity changes
  useEffect(() => {
    const mins = parseInt(duration) || 0;
    if (!activityType.trim() || mins <= 0) return;
    const estimate = estimateBurn(activityType, mins, intensity, weightKg);
    if (estimate > 0) setCaloriesBurned(String(estimate));
  }, [activityType, duration, intensity, weightKg]);

  async function save() {
    if (!activityType || !duration) {
      setError("Activity type and duration required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const burnedNum = parseInt(caloriesBurned) || 0;
      const res = await fetch("/api/activity-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_type: activityType,
          duration_minutes: parseInt(duration),
          intensity,
          calories_burned: burnedNum || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSavedCalories(burnedNum);
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-200">←</button>
          <h1 className="text-xl font-bold">Log Activity</h1>
        </div>

        <div className="card bg-emerald-500/10 border-emerald-500/30 space-y-4">
          <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">Activity logged</p>
          {savedCalories > 0 && (
            <div className="flex items-center gap-4">
              <div className="bg-slate-700/50 rounded-xl px-4 py-3 text-center shrink-0">
                <p className="text-3xl font-bold text-amber-400">{savedCalories}</p>
                <p className="text-xs text-slate-400 mt-0.5">kcal burned</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Daily budget boosted</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your calorie target has been increased by {savedCalories} kcal to reflect the energy you expended.
                </p>
              </div>
            </div>
          )}
          <div className="bg-slate-700/40 rounded-xl px-3 py-2 text-sm text-slate-300">
            <span className="text-slate-400">Activity: </span>
            {activityType} · {duration} min · {intensity} intensity
          </div>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-200">←</button>
        <h1 className="text-xl font-bold">Log Activity</h1>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Activity type</label>
          <input
            type="text"
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            placeholder="e.g. Running"
            className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {COMMON_ACTIVITIES.map((a) => (
              <button
                key={a}
                onClick={() => setActivityType(a)}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  activityType === a
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Duration (minutes)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min="1"
            placeholder="30"
            className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Intensity</label>
          <div className="flex gap-2">
            {INTENSITY_LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setIntensity(lvl)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                  intensity === lvl
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1">
            <label className="text-sm text-slate-400">Calories burned</label>
            {activityType && parseInt(duration) > 0 && (
              <span className="text-xs text-emerald-400">auto-estimated · adjust if needed</span>
            )}
          </div>
          <input
            type="number"
            value={caloriesBurned}
            onChange={(e) => setCaloriesBurned(e.target.value)}
            min="0"
            placeholder="—"
            className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it feel?"
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl"
      >
        {saving ? "Saving..." : "Save activity"}
      </button>
    </div>
  );
}
