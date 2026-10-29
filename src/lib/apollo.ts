import { env } from "@/lib/env";
import type { SegmentFilters } from "@/lib/types";

const BASE = "https://api.apollo.io/api/v1";

async function apollo<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cache-control": "no-cache",
      "x-api-key": env.apolloApiKey(),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Apollo ${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

interface SearchPerson {
  id: string;
  first_name?: string;
  title?: string;
  has_email?: boolean;
  organization?: { name?: string };
}

export interface EnrichedPerson {
  apolloId: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string;
  linkedinUrl: string | null;
  city: string | null;
  country: string | null;
  company: string | null;
  companyDomain: string | null;
  companyDescription: string | null;
}

interface MatchPerson {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  email?: string | null;
  email_status?: string | null;
  linkedin_url?: string | null;
  city?: string | null;
  country?: string | null;
  organization?: {
    name?: string | null;
    primary_domain?: string | null;
    short_description?: string | null;
  } | null;
}

/** One page of people matching a segment (no emails yet; search is free of credits). */
export async function searchPeople(filters: SegmentFilters, page: number, perPage = 25) {
  const result = await apollo<{ people?: SearchPerson[]; total_entries?: number }>(
    "/mixed_people/api_search",
    {
      page,
      per_page: perPage,
      person_titles: filters.person_titles,
      include_similar_titles: true,
      person_seniorities: filters.person_seniorities,
      person_locations: filters.person_locations,
      q_organization_keyword_tags: filters.organization_keywords,
      organization_num_employees_ranges: filters.employee_ranges,
    },
  );
  return (result.people ?? []).filter((p) => p.has_email !== false);
}

/**
 * Reveals work emails for up to 10 people at a time. Only verified addresses
 * are returned; guessed or catch-all addresses hurt deliverability.
 */
export async function enrichPeople(ids: string[]): Promise<EnrichedPerson[]> {
  const out: EnrichedPerson[] = [];
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    const result = await apollo<{ matches?: (MatchPerson | null)[] }>("/people/bulk_match", {
      reveal_personal_emails: false,
      details: batch.map((id) => ({ id })),
    });
    for (const m of result.matches ?? []) {
      if (!m?.email || m.email_status !== "verified") continue;
      out.push({
        apolloId: m.id,
        firstName: m.first_name ?? null,
        lastName: m.last_name ?? null,
        title: m.title ?? null,
        email: m.email.toLowerCase(),
        linkedinUrl: m.linkedin_url ?? null,
        city: m.city ?? null,
        country: m.country ?? null,
        company: m.organization?.name ?? null,
        companyDomain: m.organization?.primary_domain ?? null,
        companyDescription: m.organization?.short_description ?? null,
      });
    }
  }
  return out;
}
