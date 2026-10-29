import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = "claude-opus-5-5";

let client: Anthropic | undefined;
function anthropic() {
  client ??= new Anthropic();
  return client;
}

export class ClaudeRefusalError extends Error {}

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * One structured call to Claude: returns data validated against `schema`.
 *
 * - Refusal fallbacks are on (`fallbacks: "default"`), so a safety decline is
 *   retried server-side on a suitable model inside the same call.
 * - `webSearch` lets Claude research the open web (used to study competitors).
 *   Server-tool turns can pause; we resume until the model finishes.
 */
export async function generateObject<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  prompt: string;
  effort?: Effort;
  webSearch?: { maxUses: number };
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: opts.prompt }];
  const tools: Anthropic.Beta.BetaToolUnion[] = opts.webSearch
    ? [{ type: "web_search_20260209", name: "web_search", max_uses: opts.webSearch.maxUses }]
    : [];

  for (let turn = 0; turn < 5; turn++) {
    const response = await anthropic().beta.messages.parse({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(opts.schema) },
      system: opts.system,
      tools,
      messages,
    });

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content as Anthropic.Beta.BetaContentBlockParam[] });
      continue;
    }
    if (response.stop_reason === "refusal") {
      throw new ClaudeRefusalError(response.stop_details?.explanation ?? "Claude declined this request");
    }
    if (response.stop_reason === "max_tokens") {
      throw new Error("Claude ran out of output tokens before finishing");
    }
    if (response.parsed_output == null) {
      throw new Error("Claude returned output that did not match the schema");
    }
    return response.parsed_output as z.infer<S>;
  }
  throw new Error("Claude did not finish after several resumed turns");
}
