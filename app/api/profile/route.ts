import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  calculateCalorieTarget,
  calculateProteinTarget,
  calculateWaterTarget,
} from "@/lib/utils";
import type { ActivityLevel, Goal, Profile } from "@/lib/supabase/types";

type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;

const ALLOWED_FIELDS = [
  "display_name", "age", "height_cm", "weight_kg",
  "activity_level", "goal", "avatar_url",
] as const;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Only pass known profile columns — prevents stray fields (e.g. error) from reaching Supabase
  const updateData: ProfileUpdate = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) updateData[field] = body[field];
  }

  // Recalculate targets if all required stats are present
  if (updateData.age && updateData.height_cm && updateData.weight_kg && updateData.activity_level && updateData.goal) {
    updateData.calorie_target = calculateCalorieTarget(
      updateData.age as number,
      updateData.height_cm as number,
      updateData.weight_kg as number,
      updateData.activity_level as ActivityLevel,
      updateData.goal as Goal,
    );
    updateData.protein_target_g = calculateProteinTarget(
      updateData.weight_kg as number,
      updateData.goal as Goal,
    );
    updateData.water_target_ml = calculateWaterTarget(updateData.weight_kg as number);
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
