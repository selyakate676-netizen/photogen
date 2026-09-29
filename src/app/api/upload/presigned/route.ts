import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  return NextResponse.json(
    { error: "Presigned uploads are disabled; use the validated direct upload endpoint" },
    { status: 410 },
  );
}
