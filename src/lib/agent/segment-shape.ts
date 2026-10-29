import { z } from "zod";
import type { SegmentBrief } from "@/lib/types";

// Apollo's filter vocabularies, shared by analysis, steering and new buyer types.
export const SENIORITIES = [
  "owner", "founder", "c_suite", "partner", "vp", "head", "director", "manager", "senior",
] as const;
export const EMPLOYEE_RANGES = [
  "1,10", "11,20", "21,50", "51,100", "101,200", "201,500", "501,1000", "1001,5000", "5001,10000",
] as const;

export const FiltersShape = {
  person_titles: z.array(z.string()).describe("Job titles of the decision maker"),
  person_seniorities: z.array(z.enum(SENIORITIES)),
  person_locations: z.array(z.string()).describe("Countries, states or cities the company can serve"),
  organization_keywords: z.array(z.string()).describe("Industry keywords that identify these companies in a B2B database"),
  employee_ranges: z.array(z.enum(EMPLOYEE_RANGES)),
};

export const BriefShape = {
  offer: z.string().describe("The offer as pitched to this buyer type, one sentence in their language"),
  customer_problem: z.string().describe("The problem this buyer type has that the offer solves, one sentence"),
  example_clients: z.array(z.string()).describe("Up to 6 real, named companies of this type the business could serve (names only)"),
  positive_criteria: z.array(z.string()).describe("2-4 short signals that make a company a strong fit"),
  negative_criteria: z.array(z.string()).describe("0-3 short signals that rule a company out"),
};

/** The brief as prompt text for the email and reply writers. */
export function briefBlock(brief: SegmentBrief | null | undefined) {
  if (!brief) return "";
  const lines = [
    brief.offer && `Offer for this buyer type: ${brief.offer}`,
    brief.customer_problem && `Their problem: ${brief.customer_problem}`,
    brief.positive_criteria?.length && `Strong-fit signals: ${brief.positive_criteria.join("; ")}`,
    brief.negative_criteria?.length && `Not a fit if: ${brief.negative_criteria.join("; ")}`,
  ].filter(Boolean);
  return lines.length ? `\n${lines.join("\n")}` : "";
}
