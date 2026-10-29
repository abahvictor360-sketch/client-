import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { BriefShape, FiltersShape } from "@/lib/agent/segment-shape";
import { generateObject } from "@/lib/claude";
import { adminClient } from "@/lib/supabase/admin";
import { readWebsite } from "@/lib/website";

const AnalysisSchema = z.object({
  name: z.string().describe("The company's name"),
  summary: z.string().describe("One sentence: what the company sells and to whom"),
  offer: z.string().describe("The concrete offer a cold email should lead with"),
  value_props: z.array(z.string()).describe("3-5 specific, factual selling points taken from the site"),
  competitors: z
    .array(z.object({ name: z.string(), domain: z.string(), note: z.string() }))
    .describe("3-6 real competitors, each with what they do differently"),
  segments: z
    .array(
      z.object({
        name: z.string().describe('Plural buyer type, e.g. "Wedding planners"'),
        description: z.string(),
        rationale: z.string().describe("Why this buyer needs the offer"),
        fit_score: z.number().int().describe("0-100 likelihood this segment buys"),
        ...FiltersShape,
        ...BriefShape,
      }),
    )
    .describe("5-8 distinct buyer segments, best fit first"),
});

const SYSTEM = `You are the strategy step of an autonomous B2B outbound agent.
Given a company's website text, work out exactly what it sells, research its
competitors on the web, and decide which kinds of businesses buy it.

Segments must be concrete company types a B2B contact database can filter on
(job titles + industry keywords + company size + geography), not personas or
consumers. Prefer narrow segments with an obvious need over broad ones. Only
claim value props the website supports. If the company only serves a region,
restrict locations to it.`;

/** Learns what the business sells and proposes buyer segments. */
export async function analyzeBusiness(businessId: string) {
  const db = adminClient();
  const { data: business, error } = await db.from("businesses").select("*").eq("id", businessId).single();
  if (error || !business) throw new Error(`Business ${businessId} not found`);

  try {
    // Businesses without a website are analyzed from the owner's own description.
    const source = business.website
      ? `Website: ${business.website}\n\n<website_text>\n${await readWebsite(new URL(business.website))}\n</website_text>`
      : `The business has no website. The owner describes it as:\n<owner_description>\n${business.description}\n</owner_description>`;
    const request = { schema: AnalysisSchema, system: SYSTEM, effort: "high" as const, prompt: source };
    let analysis;
    try {
      analysis = await generateObject({ ...request, webSearch: { maxUses: 6 } });
    } catch (err) {
      // Web search must be enabled for the Anthropic organization; without it,
      // analyze from the website alone rather than failing the whole step.
      if (!(err instanceof Anthropic.BadRequestError)) throw err;
      console.warn("Analysis with web search failed; retrying without it", err.message);
      analysis = await generateObject(request);
    }

    await db
      .from("businesses")
      .update({
        name: analysis.name,
        summary: analysis.summary,
        offer: analysis.offer,
        value_props: analysis.value_props,
        competitors: analysis.competitors,
        status: "ready",
        error: null,
      })
      .eq("id", businessId);

    // Replace untouched segments; keep (paused) any that already emailed people,
    // so their prospects, conversations and stats survive a re-analysis.
    await db.from("segments").delete().eq("business_id", businessId).eq("sent", 0);
    await db.from("segments").update({ status: "paused" }).eq("business_id", businessId);
    await db.from("segments").insert(
      analysis.segments
        .sort((a, b) => b.fit_score - a.fit_score)
        .map((s) => ({
          business_id: businessId,
          name: s.name,
          description: s.description,
          rationale: s.rationale,
          fit_score: Math.max(0, Math.min(100, s.fit_score)),
          filters: {
            person_titles: s.person_titles,
            person_seniorities: s.person_seniorities,
            person_locations: s.person_locations,
            organization_keywords: s.organization_keywords,
            employee_ranges: s.employee_ranges,
          },
          brief: {
            offer: s.offer,
            customer_problem: s.customer_problem,
            example_clients: s.example_clients.slice(0, 8),
            positive_criteria: s.positive_criteria,
            negative_criteria: s.negative_criteria,
          },
        })),
    );
  } catch (err) {
    await db
      .from("businesses")
      .update({ status: "failed", error: err instanceof Error ? err.message : String(err) })
      .eq("id", businessId);
    throw err;
  }
}
