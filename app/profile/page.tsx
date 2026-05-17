"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ACTIVITY_LEVEL_LABELS, GOAL_LABELS } from "@/lib/constants";
import type { Profile } from "@/lib/supabase/types";

function cmToFtIn(cm: number | null | undefined): { ft: number; ins: number } {
  if (!cm) return { ft: 0, ins: 0 };
  const totalInches = cm / 2.54;
  return { ft: Math.floor(totalInches / 12), ins: Math.round(totalInches % 12) };
}

function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [heightFt, setHeightFt] = useState<number | "">("");
  const [heightIn, setHeightIn] = useState<number | "">("");
  const [weightLbs, setWeightLbs] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p: Profile) => {
        setProfile(p ?? {});
        if (p?.height_cm) {
          const { ft, ins } = cmToFtIn(p.height_cm);
          setHeightFt(ft);
          setHeightIn(ins);
        }
        if (p?.weight_kg) {
          setWeightLbs(kgToLbs(p.weight_kg));
        }
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const ft = Number(heightFt) || 0;
      const ins = Number(heightIn) || 0;
      const height_cm =
        heightFt !== "" || heightIn !== ""
          ? parseFloat(((ft * 12 + ins) * 2.54).toFixed(1))
          : null;
      const weight_kg = weightLbs !== "" ? parseFloat((Number(weightLbs) / 2.20462).toFixed(2)) : null;

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, height_cm, weight_kg }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    const { createClient } = await import("@/lib/supabase/client");
    await createClient().auth.signOut();
    router.push("/login");
  }

  function update(field: keyof Profile, value: unknown) {
    setProfile((p) => ({ ...p, [field]: value }));
  }

  if (loading) return <div className="flex items-center justify-center min-h-dvh"><div className="text-slate-400">Loading...</div></div>;

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Profile</h1>
        <button onClick={signOut} className="text-sm text-red-400 hover:text-red-300">Sign out</button>
      </div>

      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Personal details</h2>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Display name</label>
          <input
            type="text"
            value={profile.display_name ?? ""}
            onChange={(e) => update("display_name", e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Age</label>
            <input
              type="number"
              value={profile.age ?? ""}
              onChange={(e) => update("age", parseInt(e.target.value) || null)}
              min="1" max="120"
              className="w-full px-3 py-3 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Weight (lbs)</label>
            <input
              type="number"
              value={weightLbs}
              onChange={(e) => setWeightLbs(e.target.value === "" ? "" : parseFloat(e.target.value))}
              min="44" max="660" step="0.1"
              placeholder="0"
              className="w-full px-3 py-3 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Height</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input
                type="number"
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value === "" ? "" : parseInt(e.target.value))}
                min="1" max="8"
                placeholder="0"
                className="w-full px-3 py-3 pr-10 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">ft</span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value === "" ? "" : parseInt(e.target.value))}
                min="0" max="11"
                placeholder="0"
                className="w-full px-3 py-3 pr-10 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">in</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Activity & goal</h2>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Activity level</label>
          <div className="space-y-2">
            {Object.entries(ACTIVITY_LEVEL_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => update("activity_level", key as Profile["activity_level"])}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                  profile.activity_level === key
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                    : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Goal</label>
          <div className="space-y-2">
            {Object.entries(GOAL_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => update("goal", key as Profile["goal"])}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                  profile.goal === key
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                    : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {profile.calorie_target && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Daily targets</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Calories", value: `${profile.calorie_target} kcal`, color: "text-amber-400" },
              { label: "Protein",  value: `${profile.protein_target_g}g`,   color: "text-purple-400" },
              { label: "Fibre",    value: `${profile.fibre_target_g}g`,     color: "text-cyan-400" },
              { label: "Water",    value: `${profile.water_target_ml}ml`,   color: "text-blue-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-700/50 rounded-xl p-3">
                <p className="text-slate-400 text-xs">{label}</p>
                <p className={`font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">Targets recalculate automatically when you save your stats.</p>
        </div>
      )}

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className={`w-full py-3 font-semibold rounded-xl transition-colors ${
          saved
            ? "bg-green-600 text-white"
            : "bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white"
        }`}
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save profile"}
      </button>
    </div>
  );
}
