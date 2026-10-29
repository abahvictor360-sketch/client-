import { notFound } from "next/navigation";
import { cache } from "react";
import { requireUser } from "@/lib/supabase/server";
import type { Account, Business, Prospect, Segment } from "@/lib/types";

// Reads go through the user's own session, so row-level security limits them
// to the signed-in user's data. cache() shares one read across a request.

export const getBusiness = cache(async (id: string) => {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("businesses").select("*").eq("id", id).maybeSingle<Business>();
  if (!data) notFound();
  return data;
});

export const getSegments = cache(async (id: string) => {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("segments")
    .select("*")
    .eq("business_id", id)
    .order("fit_score", { ascending: false })
    .returns<Segment[]>();
  return data ?? [];
});

export const getAccount = cache(async () => {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("accounts").select("*").eq("user_id", user!.id).single<Account>();
  return data;
});

export function hostOf(business: Pick<Business, "website">) {
  return business.website ? new URL(business.website).hostname.replace(/^www\./, "") : null;
}

export function businessLabel(business: Pick<Business, "name" | "website">) {
  return business.name ?? hostOf(business) ?? "Your business";
}

export function personName(p: Pick<Prospect, "first_name" | "last_name" | "email">) {
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email;
}

/** An analysis still "running" after 6 minutes was cut off; the user can retry it. */
export function analysisStalled(business: Business) {
  return business.status === "analyzing" && Date.now() - new Date(business.analysis_started_at).getTime() > 6 * 60_000;
}

export const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
