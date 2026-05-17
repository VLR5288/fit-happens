"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const COMMON_SYMPTOMS = [
  "Fatigue", "Headache", "Bloating", "Muscle soreness", "Low energy",
  "Brain fog", "Anxiety", "Irritability", "Poor sleep", "Nausea",
];

export default function DailyNotePage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then((note) => {
        if (note) {
          setContent(note.content ?? "");
          setMood(note.mood ?? null);
          setEnergyLevel(note.energy_level ?? null);
          setSymptoms(note.symptoms ?? []);
        }
        setLoaded(true);
      });
  }, []);

  function toggleSymptom(s: string) {
    setSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function save() {
    if (!content.trim()) { setError("Please write something"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mood, energy_level: energyLevel, symptoms }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const ScalePicker = ({
    label,
    value,
    onChange,
    color = "emerald",
  }: {
    label: string;
    value: number | null;
    onChange: (v: number) => void;
    color?: string;
  }) => (
    <div>
      <label className="block text-sm text-slate-400 mb-2">{label}</label>
      <div className="flex gap-1">
        {[1,2,3,4,5,6,7,8,9,10].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              value === n
                ? `bg-${color}-500 text-white`
                : "bg-slate-700 text-slate-400 hover:text-slate-200"
            }`}
            style={value === n ? { backgroundColor: color === "amber" ? "#f59e0b" : "#10b981" } : {}}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );

  if (!loaded) return <div className="flex items-center justify-center min-h-dvh"><div className="text-slate-400">Loading...</div></div>;

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-200">←</button>
        <h1 className="text-xl font-bold">Daily Note</h1>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">How was your day?</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Anything on your mind — energy, mood, what you ate, how you slept..."
            rows={5}
            className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        <ScalePicker label="Overall mood (1–10)" value={mood} onChange={setMood} />
        <ScalePicker label="Energy level (1–10)" value={energyLevel} onChange={setEnergyLevel} color="amber" />

        <div>
          <label className="block text-sm text-slate-400 mb-2">Any symptoms? (optional)</label>
          <div className="flex flex-wrap gap-2">
            {COMMON_SYMPTOMS.map((s) => (
              <button
                key={s}
                onClick={() => toggleSymptom(s)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                  symptoms.includes(s)
                    ? "bg-red-500/30 text-red-300 border border-red-500/50"
                    : "bg-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl"
      >
        {saving ? "Saving..." : "Save note"}
      </button>

      <p className="text-center text-slate-500 text-xs">
        Your daily note is saved once per day and can be updated any time
      </p>
    </div>
  );
}
