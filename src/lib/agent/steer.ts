import { z } from "zod";
import { BriefShape, FiltersShape } from "@/lib/agent/segment-shape";
import { generateObject } from "@/lib/claude";
import { adminClient } from "@/lib/supabase/admin";
import type { Business, Segment } from "@/lib/types";

const SteerSchema = z.object({
  reply: z.string().describe("1-3 sentences to the owner: what you changed and why, or why you changed nothing"),
  changed: z.boolean().describe("True if the brief or targeting below differs from the current one"),
  name: z.string().describe("The buyer type's name (keep unless the owner asked to rename or retarget)"),
  rationale: z.string().describe("Why this buyer needs the offer"),
  ...FiltersShape,
  ...BriefShape,
});

const NewSegmentSchema = z.object({
  name: z.string().describe('Plural buyer type, e.g. "Wedding planners"'),
  rationale: z.string().describe("Why this buyer needs the offer"),
  fit_score: z.number().int().describe("0-100 likelihood this segment buys"),
  ...FiltersShape,
  ...BriefShape,
});

const SYSTEM = `You help a business owner steer one buyer type in their autonomous B2B
outbound campaign. You can rewrite the buyer type's brief (offer, customer
problem, example clients, fit criteria) and its contact-database targeting
(job titles, seniorities, locations, industry keywords, company sizes).

Apply exactly what the owner asks, keep everything else as it is, and stay
truthful to what the business actually sells. Targeting must remain filterable
in a B2B contact database. If the request is unclear or would make the
campaign worse (e.g. targeting consumers), change nothing and say why in the reply.`;

function businessContext(business: Business) {
  return `Business: ${business.name ?? business.website ?? "unnamed"}
What it sells: ${business.summary ?? business.description ?? ""}
Overall offer: ${business.offer ?? ""}
Value props: ${business.value_props.join("; ")}`;
}

function segmentRow<T extends z.infer<typeof NewSegmentSchema> | z.infer<typeof SteerSchema>>(s: T) {
  return {
    name: s.name.slice(0, 120),
    rationale: s.rationale.slice(0, 600),
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
      positive_criteria: s.positive_criteria.slice(0, 6),
      negative_criteria: s.negative_criteria.slice(0, 6),
    },
  };
}

/** Applies the owner's instruction to a buyer type and records the exchange. */
export async function steerSegment(business: Business, segment: Segment, instruction: string) {
  const db = adminClient();
  const { data: history } = await db
    .from("segment_messages")
    .select("role, body")
    .eq("segment_id", segment.id)
    .order("created_at", { ascending: false })
    .limit(8);
  const askedAt = new Date().toISOString();
  const result = await generateObject({
    schema: SteerSchema,
    system: SYSTEM,
    effort: "medium",
    maxTokens: 8000,
    prompt: `${businessContext(business)}

Current buyer type:
${JSON.stringify({ name: segment.name, rationale: segment.rationale, filters: segment.filters, brief: segment.brief }, null, 2)}

Earlier messages (newest first):
${(history ?? []).map((m) => `${m.role === "user" ? "Owner" : "You"}: ${m.body}`).join("\n") || "none"}

Owner's instruction:
<instruction>
${instruction}
</instruction>`,
  });

  if (result.changed) {
    // New targeting means Apollo should be searched again from the first page.
    const filtersChanged = JSON.stringify(segmentRow(result).filters) !== JSON.stringify(segment.filters);
    await db
      .from("segments")
      .update({ ...segmentRow(result), ...(filtersChanged ? { apollo_page: 0, status: segment.status === "exhausted" ? "testing" : segment.status } : {}) })
      .eq("id", segment.id);
  }
  // Saved only once the agent has answered, so a failed attempt leaves no orphan message.
  await db.from("segment_messages").insert([
    { segment_id: segment.id, business_id: business.id, role: "user", body: instruction, created_at: askedAt },
    { segment_id: segment.id, business_id: business.id, role: "agent", body: result.reply.slice(0, 4000), created_at: new Date().toISOString() },
  ]);
  return result;
}

/** Creates a buyer type from the owner's description of who to reach. */
export async function createSegmentFromDescription(business: Business, description: string) {
  const result = await generateObject({
    schema: NewSegmentSchema,
    system: `You design one buyer type for an autonomous B2B outbound campaign: a
concrete kind of company a B2B contact database can filter on, with the decision
maker's job titles. Stay truthful to what the business sells.`,
    effort: "medium",
    maxTokens: 8000,
    prompt: `${businessContext(business)}

The owner wants to reach:
<request>
${description}
</request>`,
  });
  const { data, error } = await adminClient()
    .from("segments")
    .insert({ business_id: business.id, fit_score: Math.max(0, Math.min(100, result.fit_score)), ...segmentRow(result) })
    .select("id")
    .single();
  if (error || !data) throw new Error("Could not save the buyer type");
  return data.id as string;
}
