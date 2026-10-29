import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Email-confirmation landing: exchanges the code for a session.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/app";
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next.startsWith("/app") ? next : "/app", url.origin));
}
