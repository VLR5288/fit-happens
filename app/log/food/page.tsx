"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { FoodAnalysisResult } from "@/lib/anthropic";
import type { FavouriteFood } from "@/lib/supabase/types";
import { MEAL_TYPES } from "@/lib/constants";

export default function LogFoodPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mealType, setMealType] = useState("lunch");

  // Photo path
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Text path
  const [textDescription, setTextDescription] = useState("");

  // Shared
  const [analysis, setAnalysis] = useState<FoodAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logSaved, setLogSaved] = useState(false);
  const [error, setError] = useState("");

  // Favourites
  const [favourites, setFavourites] = useState<FavouriteFood[]>([]);
  const [savedFavIds, setSavedFavIds] = useState<Set<string>>(new Set());
  const [favLogging, setFavLogging] = useState<string | null>(null);
  const [favLoggedId, setFavLoggedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/favourite-foods")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setFavourites(d))
      .catch(() => null);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setAnalysis(null);
    setLogSaved(false);
    setError("");
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
    // Clear text path
    setTextDescription("");
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
      setLogSaved(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function analyzeText() {
    if (!textDescription.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/food-log/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: textDescription.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setAnalysis(await res.json());
      setLogSaved(false);
      // Clear photo path
      setFile(null);
      setPreview(null);
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
      setLogSaved(true);
      setSavedFavIds(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveFavourite(food: FoodAnalysisResult["foods"][number]) {
    const key = food.name;
    try {
      const res = await fetch("/api/favourite-foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: food.name,
          calories: food.calories,
          protein_g: food.protein_g,
          fibre_g: food.fibre_g,
          carbs_g: food.carbs_g,
          fat_g: food.fat_g,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved: FavouriteFood = await res.json();
      setSavedFavIds((prev) => new Set(prev).add(key));
      setFavourites((prev) => [saved, ...prev]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save favourite");
    }
  }

  async function deleteFavourite(fav: FavouriteFood) {
    setFavourites((prev) => prev.filter((f) => f.id !== fav.id));
    await fetch(`/api/favourite-foods/${fav.id}`, { method: "DELETE" });
  }

  async function logFavourite(fav: FavouriteFood) {
    setFavLogging(fav.id);
    try {
      const res = await fetch(`/api/favourite-foods/${fav.id}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal_type: mealType }),
      });
      if (!res.ok) throw new Error(await res.text());
      setFavLoggedId(fav.id);
      // Update usage_count locally so order feels correct on next load
      setFavourites((prev) =>
        prev.map((f) => f.id === fav.id ? { ...f, usage_count: f.usage_count + 1 } : f)
      );
      setTimeout(() => {
        setFavLoggedId(null);
        router.push("/dashboard");
      }, 800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Log failed");
    } finally {
      setFavLogging(null);
    }
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-200">←</button>
        <h1 className="text-xl font-bold">Log Meal</h1>
      </div>

      {/* Favourites quick-tap */}
      {favourites.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Quick add</p>
          <div className="flex flex-wrap gap-2">
            {favourites.map((fav) => (
              <div key={fav.id} className={`flex items-center rounded-full border text-sm font-medium transition-colors ${
                favLoggedId === fav.id
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-300"
              }`}>
                <button
                  onClick={() => logFavourite(fav)}
                  disabled={favLogging === fav.id}
                  className="pl-3 pr-2 py-1.5 hover:text-emerald-400 disabled:opacity-50 transition-colors"
                >
                  {favLoggedId === fav.id ? "✓ Logged" : `⭐ ${fav.name}`}
                  <span className="ml-1.5 text-xs opacity-60">{fav.calories} kcal</span>
                </button>
                <button
                  onClick={() => deleteFavourite(fav)}
                  className="pr-2.5 pl-0.5 py-1.5 text-slate-500 hover:text-red-400 transition-colors"
                  aria-label={`Remove ${fav.name} from favourites`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Text description input */}
      {!analysis && (
        <div className="space-y-2">
          <label className="block text-sm text-slate-400">Or describe a food item instead</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={textDescription}
              onChange={(e) => {
                setTextDescription(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && analyzeText()}
              placeholder="e.g. black coffee, 2 eggs, greek yogurt"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={analyzeText}
              disabled={loading || !textDescription.trim()}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold rounded-xl text-sm whitespace-nowrap"
            >
              {loading ? "..." : "Analyse"}
            </button>
          </div>
        </div>
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

          {!logSaved ? (
            <button
              onClick={saveLog}
              disabled={saving}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl"
            >
              {saving ? "Saving..." : "Save meal log"}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-emerald-400 text-sm font-medium">Meal logged!</p>

              {/* Save as favourite buttons — one per food item */}
              <div className="space-y-2">
                {analysis.foods.map((food, i) => {
                  const saved = savedFavIds.has(food.name);
                  return (
                    <button
                      key={i}
                      onClick={() => !saved && saveFavourite(food)}
                      disabled={saved}
                      className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        saved
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 cursor-default"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-amber-500"
                      }`}
                    >
                      {saved ? `⭐ Saved "${food.name}"` : `Save "${food.name}" as favourite ⭐`}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => router.push("/dashboard")}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl"
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
