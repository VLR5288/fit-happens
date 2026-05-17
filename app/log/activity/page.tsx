"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INTENSITY_LEVELS } from "@/lib/constants";

const COMMON_ACTIVITIES = [
  "Walking", "Running", "Cycling", "Swimming", "Gym (weights)", "Yoga", "Pilates",
  "HIIT", "Rock climbing", "Tennis", "Football", "Basketball", "Dancing", "Hiking",
];

export default function ActivityLogPage() {
  const router = useRouter();
  const [activityType, setActivityType] = useState("");
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState<string>("moderate");
  const [caloriesBurned, setCaloriesBurned] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!activityType || !duration) { setError("Activity type and duration required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/activity-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_type: activityType,
          duration_minutes: parseInt(duration),
          intensity,
          calories_burned: caloriesBurned ? parseInt(caloriesBurned) : null,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
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

        <div className="grid grid-cols-2 gap-3">
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
            <label className="block text-sm text-slate-400 mb-1">Calories burned (optional)</label>
            <input
              type="number"
              value={caloriesBurned}
              onChange={(e) => setCaloriesBurned(e.target.value)}
              min="0"
              placeholder="—"
              className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
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
