import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";
import { NewCampaignForm } from "./new-campaign-form";

export const maxDuration = 300;
export const metadata = { title: "Campaigns" };

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ website?: string; about?: string }> }) {
  const { website, about } = await searchParams;
  const { supabase } = await requireUser();
  const { data: businesses } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Business[]>();
  const hasCampaigns = (businesses?.length ?? 0) > 0;

  return (
    <div className="space-y-12">
      <section className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">{hasCampaigns ? "Campaigns" : "What are you selling?"}</h1>
        <p className="mt-2 text-muted">
          Paste a website, or describe what you sell. The agent studies it and the competition, then proposes who to sell to.
        </p>
        <div className="mt-6">
          <NewCampaignForm website={website} about={about} autoStart={Boolean(website || about) && !hasCampaigns} />
        </div>
      </section>

      {hasCampaigns && (
        <section aria-labelledby="campaigns-title">
          <h2 id="campaigns-title" className="sr-only">Your campaigns</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface">
            {businesses!.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/app/b/${b.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{b.name ?? (b.website ? new URL(b.website).hostname : "Untitled business")}</p>
                    <p className="truncate text-sm text-muted">{b.summary ?? (b.website ? new URL(b.website).hostname : b.description)}</p>
                  </div>
                  <StatusPill status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
