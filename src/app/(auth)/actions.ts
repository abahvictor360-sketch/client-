"use server";

import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/app") || next.startsWith("/admin") ? next : "/app";
}

export async function signIn(_: unknown, form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email")),
    password: String(form.get("password")),
  });
  if (error) return { error: error.message };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: unknown, form: FormData) {
  const website = String(form.get("website") ?? "").trim();
  const about = String(form.get("about") ?? "").trim().slice(0, 500);
  const next = website
    ? `/app?website=${encodeURIComponent(website)}`
    : about
      ? `/app?about=${encodeURIComponent(about)}`
      : "/app";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email")),
    password: String(form.get("password")),
    options: { emailRedirectTo: `${env.appUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: error.message };
  if (!data.session) return { message: "Check your email to confirm your account." };
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_: unknown, form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  if (!email) return { error: "Enter the email you signed up with." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.appUrl()}/auth/callback?next=/reset-password`,
  });
  // Rate limits are worth surfacing; whether the address exists is not.
  if (error && error.status === 429) return { error: "Too many requests. Wait a minute and try again." };
  return { message: "If that email has an account, a reset link is on its way. Check your inbox." };
}

export async function updatePassword(_: unknown, form: FormData) {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  await supabase.auth.signOut();
  redirect("/login?reset=1");
}
