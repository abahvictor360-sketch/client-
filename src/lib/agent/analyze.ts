import { z } from "zod";
import { generateObject } from "@/lib/claude";
import { adminClient } from "@/lib/supabase/admin";
import { readWebsite } from "@/lib/website";

const SENIORITIES = [
  "owner", "founder", "c_suite", "partner", "vp", "head", "director", "manager", "senior",
] as const;
const EMPLOYEE_RANGES = [
  "1,10", "11,20", "21,50", "51,100", "101,200", "201,500", "501,1000", "1001,5000", "5001,10000",
] as const;

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
        person_titles: z.array(z.string()).describe("Job titles of the decision maker"),
        person_seniorities: z.array(z.enum(SENIORITIES)),
        person_locations: z.array(z.string()).describe("Countries, states or cities the company can serve"),
        organization_keywords: z
          .array(z.string())
          .describe("Industry keywords that identify these companies in a B2B database"),
        employee_ranges: z.array(z.enum(EMPLOYEE_RANGES)),
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
    const siteText = await readWebsite(new URL(business.website));
    const analysis = await generateObject({
      schema: AnalysisSchema,
      system: SYSTEM,
      effort: "high",
      webSearch: { maxUses: 6 },
      prompt: `Website: ${business.website}\n\n<website_text>\n${siteText}\n</website_text>`,
    });

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
