"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MEDITATION_TYPES } from "@/lib/constants";

export default function MeditationLogPage() {
  const router = useRouter();
  const [type, setType] = useState<string>("mindfulness");
  const [duration, setDuration] = useState("");
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!duration) { setError("Duration required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/meditation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          duration_minutes: parseInt(duration),
          mood_before: moodBefore,
          mood_after: moodAfter,
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

  const MoodPicker = ({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number) => void }) => (
    <div>
      <label className="block text-sm text-slate-400 mb-2">{label}</label>
      <div className="flex gap-1">
        {[1,2,3,4,5,6,7,8,9,10].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              value === n ? "bg-purple-500 text-white" : "bg-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-200">←</button>
        <h1 className="text-xl font-bold">Log Meditation</h1>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Type</label>
          <div className="flex flex-wrap gap-2">
            {MEDITATION_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${
                  type === t ? "bg-purple-500 text-white" : "bg-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.replace("_", " ")}
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
            placeholder="10"
            className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-purple-500"
          />
        </div>

        <MoodPicker label="Mood before (1–10)" value={moodBefore} onChange={setMoodBefore} />
        <MoodPicker label="Mood after (1–10)" value={moodAfter} onChange={setMoodAfter} />

        <div>
          <label className="block text-sm text-slate-400 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any observations..."
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-semibold rounded-xl"
      >
        {saving ? "Saving..." : "Save session"}
      </button>
    </div>
  );
}
