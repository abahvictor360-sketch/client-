import { z } from "zod";
import { generateObject } from "@/lib/claude";
import type { Account, Business, Message, Prospect, Segment } from "@/lib/types";
import { normalizeWebsite, readWebsite } from "@/lib/website";

const EmailSchema = z.object({
  subject: z.string().describe("Short, lowercase-friendly subject, no clickbait"),
  body: z.string().describe("Plain-text email body ending with the sender's first name; no signature block, no links"),
});

const SYSTEM = `You write cold B2B emails for an autonomous outbound agent.

Rules:
- Under 90 words. Plain text. No links, no images, no attachments, no emojis.
- Open with one specific, true observation about the prospect's business taken
  from the research provided. Never invent facts; if research is thin, open with
  their role or industry instead.
- Connect that observation to one concrete benefit of the offer.
- End with one low-friction question (interest, not a calendar link).
- Sound like a person writing to one person. No "I hope this finds you well",
  no buzzwords, no exclamation marks, no fake familiarity.
- Sign off with the sender's first name only; a compliance footer is added later.
- Follow-ups: shorter (under 50 words), add a new angle, reply in the same thread,
  and the final follow-up politely closes the loop.`;

async function prospectResearch(prospect: Prospect) {
  const parts = [prospect.company_description ?? ""];
  if (prospect.company_domain) {
    try {
      const text = await readWebsite(normalizeWebsite(prospect.company_domain));
      parts.push(text.slice(0, 5000));
    } catch {
      // A missing or unreadable site just means less personalization.
    }
  }
  return parts.filter(Boolean).join("\n\n") || "No research available.";
}

export async function writeEmail(opts: {
  account: Account;
  business: Business;
  segment: Segment;
  prospect: Prospect;
  step: number;
  thread: Message[];
}) {
  const { account, business, segment, prospect, step, thread } = opts;
  const research = step === 0 ? await prospectResearch(prospect) : "(see earlier emails)";
  const history = thread
    .map((m) => `[${m.direction === "outbound" ? "We sent" : "They replied"}]\nSubject: ${m.subject ?? ""}\n${m.body}`)
    .join("\n\n");

  return generateObject({
    schema: EmailSchema,
    system: SYSTEM,
    effort: "medium",
    maxTokens: 8000,
    prompt: `Sender: ${account.sender_name} (${account.sender_title ?? "team"}) at ${account.company_name}
What we sell: ${business.summary}
Offer: ${business.offer}
Value props:
${business.value_props.map((v) => `- ${v}`).join("\n")}

Target segment: ${segment.name} — ${segment.rationale ?? segment.description ?? ""}

Prospect: ${prospect.first_name ?? ""} ${prospect.last_name ?? ""}, ${prospect.title ?? ""} at ${prospect.company ?? "their company"}
<prospect_research>
${research}
</prospect_research>

${step === 0 ? "Write the first email." : `Write follow-up #${step} of 2 (${step === 2 ? "final" : "not final"}). Earlier emails:\n${history}`}`,
  });
}
