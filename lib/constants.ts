export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very_active"] as const;
export const INTENSITY_LEVELS = ["low", "moderate", "high"] as const;
export const MEDITATION_TYPES = ["guided", "breathwork", "body_scan", "mindfulness", "other"] as const;
export const GOALS = ["lose_fat", "recomposition", "build_strength", "maintain"] as const;

export const WATER_QUICK_ADD_ML = [150, 250, 350, 500, 750] as const;

export const FIBRE_TARGET_G = 30; // standard recommendation

export const ACTIVITY_LEVEL_LABELS: Record<string, string> = {
  sedentary: "Sedentary (desk job, little exercise)",
  light: "Lightly active (1-3 days/week)",
  moderate: "Moderately active (3-5 days/week)",
  active: "Active (6-7 days/week)",
  very_active: "Very active (physical job or 2x/day training)",
};

export const GOAL_LABELS: Record<string, string> = {
  lose_fat: "Lose fat",
  recomposition: "Body recomposition (lose fat + build muscle)",
  build_strength: "Build strength",
  maintain: "Maintain & feel good",
};
