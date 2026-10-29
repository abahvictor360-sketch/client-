import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";

/**
 * Allows only admins (accounts.is_admin). Non-admins get a 404 so the admin
 * area isn't advertised.
 */
export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login?next=/admin");
  const { data } = await supabase.from("accounts").select("is_admin").eq("user_id", user.id).single();
  if (!data?.is_admin) notFound();
  return user;
}
