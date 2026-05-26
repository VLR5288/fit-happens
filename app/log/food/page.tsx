"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { FoodAnalysisResult } from "@/lib/anthropic";
import type { FavouriteFood } from "@/lib/supabase/types";
import { MEAL_TYPES } from "@/lib/constants";

interface EditableFood {
  name: string;
  qty: number;
  unit: string;
  calories: number;
  protein_g: number;
  fibre_g: number;
  carbs_g: number;
  fat_g: number;
  calsPerUnit: number;
  proteinPerUnit: number;
  fibrePerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
  source: "exact" | "estimated";
}

function parsePortion(portion: string): { qty: number; unit: string } {
  const match = portion.match(/^(\d+(?:\.\d+)?)\s*(.*)/);
  if (match) return { qty: parseFloat(match[1]), unit: match[2].trim() };
  return { qty: 1, unit: portion };
}

function toEditable(foods: FoodAnalysisResult["foods"]): EditableFood[] {
  return foods.map((f) => {
    const { qty, unit } = parsePortion(f.estimated_portion);
    const safeQty = qty > 0 ? qty : 1;
    return {
      name: f.name,
      qty: safeQty,
      unit,
      calories: f.calories,
      protein_g: f.protein_g,
      fibre_g: f.fibre_g,
      carbs_g: f.carbs_g,
      fat_g: f.fat_g,
      calsPerUnit: f.calories / safeQty,
      proteinPerUnit: f.protein_g / safeQty,
      fibrePerUnit: f.fibre_g / safeQty,
      carbsPerUnit: f.carbs_g / safeQty,
      fatPerUnit: f.fat_g / safeQty,
      source: f.source ?? "estimated",
    };
  });
}

export default function LogFoodPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mealType, setMealType] = useState("lunch");

  // Photo path
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Text path
  const [textDescription, setTextDescription] = useState("");
  const [submittedDescription, setSubmittedDescription] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  // Shared
  const [analysis, setAnalysis] = useState<FoodAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logSaved, setLogSaved] = useState(false);
  const [error, setError] = useState("");

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editedFoods, setEditedFoods] = useState<EditableFood[]>([]);
  const [editedPrepMethod, setEditedPrepMethod] = useState("");
  const [newFood, setNewFood] = useState({ name: "", portion: "", calories: "" });

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
    setTextDescription("");
    setSubmittedDescription("");
    setIsEditingDescription(false);
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
      setSubmittedDescription(textDescription.trim());
      setIsEditingDescription(false);
      setAnalysis(await res.json());
      setLogSaved(false);
      setFile(null);
      setPreview(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  function startEditing() {
    if (!analysis) return;
    setEditedFoods(toEditable(analysis.foods));
    setEditedPrepMethod(analysis.prep_method);
    setNewFood({ name: "", portion: "", calories: "" });
    setIsEditing(true);
  }

  function updateFoodName(idx: number, name: string) {
    setEditedFoods((prev) => prev.map((f, i) => (i === idx ? { ...f, name } : f)));
  }

  function updateQty(idx: number, rawQty: string) {
    const qty = parseFloat(rawQty) || 0;
    setEditedFoods((prev) =>
      prev.map((f, i) => {
        if (i !== idx) return f;
        return {
          ...f,
          qty,
          calories: Math.round(f.calsPerUnit * qty),
          protein_g: Math.round(f.proteinPerUnit * qty * 10) / 10,
          fibre_g: Math.round(f.fibrePerUnit * qty * 10) / 10,
          carbs_g: Math.round(f.carbsPerUnit * qty * 10) / 10,
          fat_g: Math.round(f.fatPerUnit * qty * 10) / 10,
        };
      })
    );
  }

  function updateMacro(
    idx: number,
    field: "calories" | "protein_g" | "fibre_g" | "carbs_g" | "fat_g",
    raw: string,
  ) {
    const val = parseFloat(raw) || 0;
    const perUnitKey = {
      calories: "calsPerUnit",
      protein_g: "proteinPerUnit",
      fibre_g: "fibrePerUnit",
      carbs_g: "carbsPerUnit",
      fat_g: "fatPerUnit",
    } as const;
    setEditedFoods((prev) =>
      prev.map((f, i) => {
        if (i !== idx) return f;
        return {
          ...f,
          [field]: val,
          [perUnitKey[field]]: f.qty > 0 ? val / f.qty : val,
          source: "exact" as const,
        };
      })
    );
  }

  function removeFood(idx: number) {
    setEditedFoods((prev) => prev.filter((_, i) => i !== idx));
  }

  function addNewFood() {
    const name = newFood.name.trim() || "Unknown food";
    const portion = parseFloat(newFood.portion) || 100;
    const cals = parseInt(newFood.calories) || 0;
    setEditedFoods((prev) => [
      ...prev,
      {
        name,
        qty: portion,
        unit: "g",
        calories: cals,
        protein_g: 0,
        fibre_g: 0,
        carbs_g: 0,
        fat_g: 0,
        calsPerUnit: portion > 0 ? cals / portion : cals,
        proteinPerUnit: 0,
        fibrePerUnit: 0,
        carbsPerUnit: 0,
        fatPerUnit: 0,
        source: "exact" as const,
      },
    ]);
    setNewFood({ name: "", portion: "", calories: "" });
  }

  function applyEdits() {
    if (!analysis) return;
    const updatedFoods = editedFoods.map((f) => ({
      name: f.name,
      estimated_portion: `${f.qty}${f.unit ? " " + f.unit : ""}`.trim(),
      calories: f.calories,
      protein_g: f.protein_g,
      fibre_g: f.fibre_g,
      carbs_g: f.carbs_g,
      fat_g: f.fat_g,
      source: f.source,
    }));
    const totals = editedFoods.reduce(
      (acc, f) => ({
        calories: acc.calories + f.calories,
        protein_g: acc.protein_g + f.protein_g,
        fibre_g: acc.fibre_g + f.fibre_g,
        carbs_g: acc.carbs_g + f.carbs_g,
        fat_g: acc.fat_g + f.fat_g,
      }),
      { calories: 0, protein_g: 0, fibre_g: 0, carbs_g: 0, fat_g: 0 }
    );
    setAnalysis({
      ...analysis,
      foods: updatedFoods,
      total_calories: Math.round(totals.calories),
      total_protein_g: Math.round(totals.protein_g * 10) / 10,
      total_fibre_g: Math.round(totals.fibre_g * 10) / 10,
      total_carbs_g: Math.round(totals.carbs_g * 10) / 10,
      total_fat_g: Math.round(totals.fat_g * 10) / 10,
      prep_method: editedPrepMethod,
    });
    setIsEditing(false);
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
      setFavourites((prev) =>
        prev.map((f) => (f.id === fav.id ? { ...f, usage_count: f.usage_count + 1 } : f))
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
              <div
                key={fav.id}
                className={`flex items-center rounded-full border text-sm font-medium transition-colors ${
                  favLoggedId === fav.id
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-300"
                }`}
              >
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

      {/* Photo picker — hidden after text analysis (no preview); compact after photo analysis */}
      {(!analysis || preview) && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`card border-dashed border-2 border-slate-600 hover:border-emerald-500 cursor-pointer flex flex-col items-center justify-center transition-colors ${!analysis ? "min-h-48" : ""}`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="meal preview"
              className={`w-full rounded-xl object-cover ${analysis ? "max-h-36" : "max-h-64"}`}
            />
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
      )}

      {file && !analysis && (
        <button
          onClick={analyzePhoto}
          disabled={loading}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl"
        >
          {loading ? "Analysing with AI..." : "Analyse with AI"}
        </button>
      )}

      {/* Submitted description chip — shown after text analysis */}
      {analysis && submittedDescription && !isEditingDescription && (
        <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2">
          <span className="text-xs text-slate-500 shrink-0">Description</span>
          <span className="flex-1 text-sm text-slate-300 truncate">{submittedDescription}</span>
          <button
            onClick={() => setIsEditingDescription(true)}
            className="text-xs text-emerald-400 hover:text-emerald-300 shrink-0 font-medium"
          >
            Edit
          </button>
        </div>
      )}

      {/* Text description input — shown before analysis or when editing description */}
      {(!analysis || isEditingDescription) && !file && (
        <div className="space-y-2">
          <label className="block text-sm text-slate-400">
            {isEditingDescription ? "Edit your description" : "Or describe a food item instead"}
          </label>
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
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus={isEditingDescription}
            />
            <button
              onClick={analyzeText}
              disabled={loading || !textDescription.trim()}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold rounded-xl text-sm whitespace-nowrap"
            >
              {loading ? "..." : isEditingDescription ? "Re-analyse" : "Analyse"}
            </button>
          </div>
          {isEditingDescription && (
            <button
              onClick={() => setIsEditingDescription(false)}
              className="text-xs text-slate-500 hover:text-slate-400"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      {/* Analysis results — view mode */}
      {analysis && !isEditing && (
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
                  <span className="text-slate-300 flex items-center gap-1 flex-wrap">
                    {f.name}
                    <span className="text-slate-500">({f.estimated_portion})</span>
                    {f.source === "exact" ? (
                      <span className="text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-1 py-0.5 leading-none">Label</span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-700/60 rounded px-1 py-0.5 leading-none">Est.</span>
                    )}
                  </span>
                  <span className="text-slate-400 shrink-0 ml-2">{f.calories} kcal</span>
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
            <div className="flex gap-2">
              <button
                onClick={startEditing}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl"
              >
                Edit
              </button>
              <button
                onClick={saveLog}
                disabled={saving}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-emerald-400 text-sm font-medium">Meal logged!</p>

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

      {/* Edit mode */}
      {analysis && isEditing && (
        <div className="space-y-4">
          <div className="card space-y-4">
            <h2 className="font-semibold text-slate-200">Edit meal</h2>

            {/* Editable food items */}
            <div className="space-y-3">
              {editedFoods.map((f, i) => (
                <div key={i} className="bg-slate-700/50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={f.name}
                      onChange={(e) => updateFoodName(i, e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => removeFood(i)}
                      className="text-red-400 hover:text-red-300 text-xl leading-none px-1"
                      aria-label={`Remove ${f.name}`}
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 shrink-0">Portion</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={f.qty}
                      onChange={(e) => updateQty(i, e.target.value)}
                      className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                    {f.unit && <span className="text-slate-400 text-sm">{f.unit}</span>}
                    <span className="ml-auto shrink-0">
                      {f.source === "exact" ? (
                        <span className="text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-1.5 py-0.5 leading-none">Label</span>
                      ) : (
                        <span className="text-[10px] text-slate-500 bg-slate-700/60 rounded px-1.5 py-0.5 leading-none">Est.</span>
                      )}
                    </span>
                  </div>
                  {/* Direct macro editing — editing any value marks the item as exact */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {([
                      { key: "calories" as const, label: "Cal", unit: "kcal", color: "text-amber-400" },
                      { key: "protein_g" as const, label: "Pro", unit: "g", color: "text-purple-400" },
                      { key: "carbs_g" as const, label: "Carb", unit: "g", color: "text-green-400" },
                      { key: "fat_g" as const, label: "Fat", unit: "g", color: "text-orange-400" },
                      { key: "fibre_g" as const, label: "Fib", unit: "g", color: "text-cyan-400" },
                    ] as const).map(({ key, label, unit, color }) => (
                      <div key={key} className="flex flex-col items-center gap-0.5">
                        <span className={`text-[10px] ${color}`}>{label}</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={f[key]}
                          onChange={(e) => updateMacro(i, key, e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-1 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 text-center"
                        />
                        <span className="text-[10px] text-slate-600">{unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Add a missed food item */}
            <div className="bg-slate-700/30 rounded-xl p-3 space-y-2 border border-dashed border-slate-600">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Add missed item</p>
              <input
                value={newFood.name}
                onChange={(e) => setNewFood((p) => ({ ...p, name: e.target.value }))}
                placeholder="Food name"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={newFood.portion}
                  onChange={(e) => setNewFood((p) => ({ ...p, portion: e.target.value }))}
                  placeholder="Grams"
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="number"
                  min="0"
                  value={newFood.calories}
                  onChange={(e) => setNewFood((p) => ({ ...p, calories: e.target.value }))}
                  placeholder="kcal"
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={addNewFood}
                  disabled={!newFood.name.trim()}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-semibold rounded-lg"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Prep method */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Prep method</label>
              <input
                value={editedPrepMethod}
                onChange={(e) => setEditedPrepMethod(e.target.value)}
                placeholder="e.g. grilled, steamed, raw"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-400 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={applyEdits}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
