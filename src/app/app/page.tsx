import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";
import { NewCampaignForm } from "./new-campaign-form";

export const maxDuration = 300;
export const metadata = { title: "Campaigns" };

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ website?: string }> }) {
  const { website } = await searchParams;
  const { supabase } = await requireUser();
  const { data: businesses } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Business[]>();

  return (
    <div className="space-y-10">
      <section className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-medium tracking-tight">What are you selling?</h1>
        <p className="mt-2 text-muted">
          Paste a website. The agent learns the offer, researches competitors and proposes who to sell to.
        </p>
        <div className="mt-6 text-left">
          <NewCampaignForm website={website} />
        </div>
      </section>

      {businesses && businesses.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium">Your campaigns</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {businesses.map((b) => (
              <Link key={b.id} href={`/app/b/${b.id}`} className="card block p-5 transition hover:border-fg">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{b.name ?? new URL(b.website).hostname}</p>
                    <p className="truncate text-sm text-muted">{new URL(b.website).hostname}</p>
                  </div>
                  <StatusPill status={b.status} />
                </div>
                {b.summary && <p className="mt-3 line-clamp-2 text-sm text-muted">{b.summary}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
