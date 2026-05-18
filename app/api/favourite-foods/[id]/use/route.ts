import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { MealType } from "@/lib/supabase/types";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { meal_type = "snack" } = await request.json() as { meal_type?: MealType };

  const { data: fav, error: fetchError } = await supabase
    .from("favourite_foods")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !fav) {
    return NextResponse.json({ error: "Favourite not found" }, { status: 404 });
  }

  const [logResult, incResult] = await Promise.all([
    supabase.from("food_logs").insert({
      user_id: user.id,
      meal_type,
      foods_identified: [{ name: fav.name, estimated_portion: "1 serving", calories: fav.calories, protein_g: fav.protein_g, fibre_g: fav.fibre_g, carbs_g: fav.carbs_g, fat_g: fav.fat_g }],
      calories: fav.calories,
      protein_g: fav.protein_g,
      fibre_g: fav.fibre_g,
      carbs_g: fav.carbs_g,
      fat_g: fav.fat_g,
      photo_url: null,
      prep_method: null,
      ai_suggestion: null,
      notes: null,
    }).select().single(),
    supabase.from("favourite_foods")
      .update({ usage_count: fav.usage_count + 1 })
      .eq("id", fav.id),
  ]);

  if (logResult.error) return NextResponse.json({ error: logResult.error.message }, { status: 500 });
  if (incResult.error) return NextResponse.json({ error: incResult.error.message }, { status: 500 });

  return NextResponse.json(logResult.data, { status: 201 });
}
