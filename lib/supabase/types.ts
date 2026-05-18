export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose_fat" | "recomposition" | "build_strength" | "maintain";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type Intensity = "low" | "moderate" | "high";
export type MeditationType = "guided" | "breathwork" | "body_scan" | "mindfulness" | "other";

export type Profile = {
  id: string;
  created_at: string;
  updated_at: string;
  display_name: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel;
  goal: Goal;
  calorie_target: number | null;
  protein_target_g: number | null;
  fibre_target_g: number;
  water_target_ml: number | null;
  avatar_url: string | null;
};

export type FoodLog = {
  id: string;
  user_id: string;
  logged_at: string;
  meal_type: MealType;
  photo_url: string | null;
  foods_identified: Json;
  calories: number | null;
  protein_g: number | null;
  fibre_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  prep_method: string | null;
  ai_suggestion: string | null;
  notes: string | null;
  created_at: string;
};

export type WaterLog = {
  id: string;
  user_id: string;
  logged_at: string;
  amount_ml: number;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  user_id: string;
  logged_at: string;
  activity_type: string;
  duration_minutes: number;
  intensity: Intensity;
  calories_burned: number | null;
  notes: string | null;
  created_at: string;
};

export type WorkoutPlan = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  days_per_week: number;
  exercises: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MeditationLog = {
  id: string;
  user_id: string;
  logged_at: string;
  duration_minutes: number;
  type: MeditationType;
  mood_before: number | null;
  mood_after: number | null;
  notes: string | null;
  created_at: string;
};

export type DailyNote = {
  id: string;
  user_id: string;
  note_date: string;
  content: string;
  mood: number | null;
  energy_level: number | null;
  symptoms: string[] | null;
  created_at: string;
  updated_at: string;
};

export type FavouriteFood = {
  id: string;
  user_id: string;
  name: string;
  calories: number;
  protein_g: number;
  fibre_g: number;
  carbs_g: number;
  fat_g: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      food_logs: {
        Row: FoodLog;
        Insert: Omit<FoodLog, "id" | "created_at" | "logged_at"> & { logged_at?: string };
        Update: Partial<Omit<FoodLog, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      water_logs: {
        Row: WaterLog;
        Insert: Omit<WaterLog, "id" | "created_at" | "logged_at"> & { logged_at?: string };
        Update: Partial<Omit<WaterLog, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      activity_logs: {
        Row: ActivityLog;
        Insert: Omit<ActivityLog, "id" | "created_at" | "logged_at"> & { logged_at?: string };
        Update: Partial<Omit<ActivityLog, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      workout_plans: {
        Row: WorkoutPlan;
        Insert: Omit<WorkoutPlan, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<WorkoutPlan, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      meditation_logs: {
        Row: MeditationLog;
        Insert: Omit<MeditationLog, "id" | "created_at" | "logged_at"> & { logged_at?: string };
        Update: Partial<Omit<MeditationLog, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      daily_notes: {
        Row: DailyNote;
        Insert: Omit<DailyNote, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<DailyNote, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      favourite_foods: {
        Row: FavouriteFood;
        Insert: Omit<FavouriteFood, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<FavouriteFood, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
