"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WATER_QUICK_ADD_ML } from "@/lib/constants";

export default function WaterLogPage() {
  const router = useRouter();
  const [todayMl, setTodayMl] = useState(0);
  const [target, setTarget] = useState(2500);
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/water-log")
      .then((r) => r.json())
      .then((logs: { amount_ml: number }[]) =>
        setTodayMl(logs.reduce((s, l) => s + l.amount_ml, 0))
      );
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p: { water_target_ml?: number }) => {
        if (p?.water_target_ml) setTarget(p.water_target_ml);
      });
  }, []);

  async function addWater(ml: number) {
    if (ml <= 0) return;
    setSaving(true);
    await fetch("/api/water-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount_ml: ml }),
    });
    setTodayMl((prev) => prev + ml);
    setCustom("");
    setSaving(false);
  }

  const pct = Math.min((todayMl / target) * 100, 100);

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-200">←</button>
        <h1 className="text-xl font-bold">Water Log</h1>
      </div>

      {/* Progress bar */}
      <div className="card space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="text-3xl font-bold text-blue-400">{todayMl} <span className="text-base font-normal text-slate-400">ml</span></span>
          <span className="text-slate-400 text-sm">target {target} ml</span>
        </div>
        <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-center text-slate-400 text-sm">
          {pct >= 100 ? "🎉 Target reached!" : `${target - todayMl} ml remaining`}
        </p>
      </div>

      {/* Quick add */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Quick add</h2>
        <div className="grid grid-cols-3 gap-2">
          {WATER_QUICK_ADD_ML.map((ml) => (
            <button
              key={ml}
              onClick={() => addWater(ml)}
              disabled={saving}
              className="py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              💧 {ml}ml
            </button>
          ))}
        </div>
      </div>

      {/* Custom amount */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Custom amount</h2>
        <div className="flex gap-2">
          <input
            type="number"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Amount in ml"
            className="flex-1 px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => addWater(parseInt(custom || "0"))}
            disabled={saving || !custom}
            className="px-5 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
