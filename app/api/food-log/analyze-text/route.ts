import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeFoodText } from "@/lib/anthropic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { description } = await request.json() as { description?: string };
  if (!description?.trim()) {
    return NextResponse.json({ error: "No description provided" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("calorie_target, protein_target_g")
    .eq("id", user.id)
    .single();

  const analysis = await analyzeFoodText(description.trim(), profile ?? undefined);
  return NextResponse.json(analysis);
}
