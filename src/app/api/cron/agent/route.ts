import { NextResponse } from "next/server";
import { runAgentTick } from "@/lib/agent/run";
import { env } from "@/lib/env";

export const maxDuration = 300;

// Vercel Cron calls this every 10 minutes (see vercel.json) with the CRON_SECRET bearer token.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret()}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runAgentTick());
}
