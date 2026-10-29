import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { NewCampaignForm } from "./new-campaign-form";

export const maxDuration = 300;
export const metadata = { title: "New business" };

export default async function AppHome({
  searchParams,
}: {
  searchParams: Promise<{ website?: string; about?: string; new?: string }>;
}) {
  const { website, about, new: adding } = await searchParams;
  const { supabase } = await requireUser();
  const { data: latest } = await supabase
    .from("businesses")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Returning users land on their most recent business's dashboard.
  if (latest && !adding && !website && !about) redirect(`/app/b/${latest.id}`);

  return (
    <section className="mx-auto max-w-2xl py-6 sm:py-12">
      <p className="eyebrow">{latest ? "Add a business" : "Step 1"}</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Let&rsquo;s find your next customers</h1>
      <p className="mt-2 text-muted">
        Share your business website (or describe your business). We work out who your ideal customers are, find them, and
        reach out for you.
      </p>
      <div className="panel mt-6 p-5 sm:p-6">
        <NewCampaignForm website={website} about={about} autoStart={Boolean(website || about) && !latest} />
      </div>
    </section>
  );
}
