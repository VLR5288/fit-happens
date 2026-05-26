import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Historical data is never deleted — this endpoint is a no-op kept for
  // backwards compatibility. The dashboard already shows today-only data
  // based on the current date, so a router.refresh() is all that's needed.
  return NextResponse.json({ ok: true });
}
