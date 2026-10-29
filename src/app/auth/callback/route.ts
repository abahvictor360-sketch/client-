import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Landing for email links (sign-up confirmation, password reset): exchanges
// the one-time code for a session, then continues to `next`.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next") ?? "/app";
  const next = rawNext.startsWith("/app") || rawNext === "/reset-password" ? rawNext : "/app";

  const linkError = url.searchParams.get("error_description");
  let failed = Boolean(linkError) || !code;
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  }
  if (failed) {
    const login = new URL("/login", url.origin);
    login.searchParams.set(
      "error",
      "That link has expired or was opened in a different browser. Sign in, or request a new link.",
    );
    return NextResponse.redirect(login);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
