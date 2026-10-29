import type { BusinessFacts } from "@/lib/types";

const LABELS: Record<keyof BusinessFacts, string> = {
  pricing: "Pricing",
  capabilities: "Capabilities and integrations",
  proof: "Proof and case studies",
};

/** Owner-supplied facts for the prompt, so the agent quotes them instead of guessing. */
export function factsBlock(facts: BusinessFacts | null | undefined) {
  const lines = (Object.keys(LABELS) as (keyof BusinessFacts)[])
    .filter((k) => facts?.[k]?.trim())
    .map((k) => `${LABELS[k]} (from the owner, quote only this): ${facts![k]!.trim()}`);
  return lines.length ? `\n${lines.join("\n")}` : "";
}
