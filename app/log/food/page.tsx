"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { FoodAnalysisResult } from "@/lib/anthropic";
import { MEAL_TYPES } from "@/lib/constants";

export default function LogFoodPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mealType, setMealType] = useState<string>("lunch");
  const [analysis, setAnalysis] = useState<FoodAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setAnalysis(null);
    setError("");
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function analyzePhoto() {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/food-log/analyze", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      setAnalysis(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveLog() {
    if (!analysis) return;
    setSaving(true);
    try {
      const res = await fetch("/api/food-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_type: mealType,
          foods_identified: analysis.foods,
          calories: analysis.total_calories,
          protein_g: analysis.total_protein_g,
          fibre_g: analysis.total_fibre_g,
          carbs_g: analysis.total_carbs_g,
          fat_g: analysis.total_fat_g,
          prep_method: analysis.prep_method,
          ai_suggestion: analysis.suggestion,
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
        <h1 className="text-xl font-bold">Log Meal</h1>
      </div>

      {/* Meal type selector */}
      <div className="flex gap-2 flex-wrap">
        {MEAL_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setMealType(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
              mealType === t
                ? "bg-emerald-500 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Photo picker */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="card border-dashed border-2 border-slate-600 hover:border-emerald-500 cursor-pointer flex flex-col items-center justify-center min-h-48 transition-colors"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="meal preview" className="w-full rounded-xl object-cover max-h-64" />
        ) : (
          <>
            <span className="text-4xl mb-2">📸</span>
            <p className="text-slate-400 text-sm">Tap to take or choose a photo</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {file && !analysis && (
        <button
          onClick={analyzePhoto}
          disabled={loading}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl"
        >
          {loading ? "Analysing with AI..." : "Analyse with AI"}
        </button>
      )}

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      {/* Analysis results */}
      {analysis && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <h2 className="font-semibold text-slate-200">Nutritional breakdown</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { label: "Calories", value: `${analysis.total_calories} kcal`, color: "text-amber-400" },
                { label: "Protein",  value: `${analysis.total_protein_g}g`,    color: "text-purple-400" },
                { label: "Fibre",    value: `${analysis.total_fibre_g}g`,       color: "text-cyan-400" },
                { label: "Carbs",    value: `${analysis.total_carbs_g}g`,       color: "text-green-400" },
                { label: "Fat",      value: `${analysis.total_fat_g}g`,         color: "text-orange-400" },
                { label: "Prep",     value: analysis.prep_method,              color: "text-slate-300" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-700/50 rounded-lg p-2">
                  <p className="text-slate-400 text-xs">{label}</p>
                  <p className={`font-semibold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              {analysis.foods.map((f, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-300">{f.name} <span className="text-slate-500">({f.estimated_portion})</span></span>
                  <span className="text-slate-400">{f.calories} kcal</span>
                </div>
              ))}
            </div>
          </div>

          {analysis.suggestion && (
            <div className="card bg-emerald-500/10 border-emerald-500/30">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1">AI tip</p>
              <p className="text-sm text-slate-200">{analysis.suggestion}</p>
            </div>
          )}

          <button
            onClick={saveLog}
            disabled={saving}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl"
          >
            {saving ? "Saving..." : "Save meal log"}
          </button>
        </div>
      )}
    </div>
  );
}
