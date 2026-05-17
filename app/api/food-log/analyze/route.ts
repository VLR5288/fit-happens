import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeFoodPhoto } from "@/lib/anthropic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("photo") as File | null;
  if (!file) return NextResponse.json({ error: "No photo provided" }, { status: 400 });

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"] as const;
  type AllowedType = typeof allowedTypes[number];
  if (!allowedTypes.includes(file.type as AllowedType)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const { data: profile } = await supabase
    .from("profiles")
    .select("calorie_target, protein_target_g")
    .eq("id", user.id)
    .single();

  const analysis = await analyzeFoodPhoto(base64, file.type as AllowedType, profile ?? undefined);
  return NextResponse.json(analysis);
}
