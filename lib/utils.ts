export function calculateCalorieTarget(
  age: number,
  heightCm: number,
  weightKg: number,
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active",
  goal: "lose_fat" | "recomposition" | "build_strength" | "maintain",
  sex: "male" | "female" = "female"
): number {
  // Mifflin-St Jeor BMR
  const bmr =
    sex === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const tdee = bmr * activityMultipliers[activityLevel];

  const goalAdjustment = { lose_fat: -500, recomposition: -200, build_strength: 200, maintain: 0 };
  return Math.round(tdee + goalAdjustment[goal]);
}

export function calculateProteinTarget(weightKg: number, goal: "lose_fat" | "recomposition" | "build_strength" | "maintain"): number {
  const multipliers = { lose_fat: 2.0, recomposition: 2.2, build_strength: 1.8, maintain: 1.6 };
  return Math.round(weightKg * multipliers[goal]);
}

export function calculateWaterTarget(weightKg: number, activityMinutes = 0): number {
  return Math.round(weightKg * 35 + activityMinutes * 12);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
