import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_TEXT_CHARS = 40_000;

/** Normalizes user input like "acme.com" or "https://www.acme.com/x" to an origin URL. */
export function normalizeWebsite(input: string): URL {
  const trimmed = input.trim();
  const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only http(s) websites are supported");
  if (!url.hostname.includes(".")) throw new Error("Enter a public website like acme.com");
  return new URL(url.origin);
}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase();
    return a === "::1" || a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe80") || a.startsWith("::ffff:");
  }
  const [a, b] = address.split(".").map(Number);
  return (
    a === 10 || a === 127 || a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

// The URL comes from the user, so refuse anything that resolves inside our network.
async function assertPublicHost(url: URL) {
  const addresses = await lookup(url.hostname, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("That website does not resolve to a public address");
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

async function fetchPage(url: URL): Promise<{ html: string; text: string } | null> {
  await assertPublicHost(url);
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
    headers: { "user-agent": "Mozilla/5.0 (compatible; LeadloopBot/1.0)" },
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) return null;
    const next = new URL(location, url);
    if (next.hostname.replace(/^www\./, "") !== url.hostname.replace(/^www\./, "")) return null;
    return fetchPage(next);
  }
  if (!response.ok || !(response.headers.get("content-type") ?? "").includes("text/html")) return null;
  const html = (await response.text()).slice(0, 2_000_000);
  return { html, text: htmlToText(html) };
}

/**
 * Reads the homepage plus a few same-site pages that usually describe the
 * offer (about, pricing, product) and returns their combined text.
 */
export async function readWebsite(site: URL): Promise<string> {
  const home = await fetchPage(site);
  if (!home) throw new Error(`Could not read ${site.hostname}`);

  const wanted = /(about|pricing|product|services|solutions|features|customers|wholesale)/i;
  const links = new Set<string>();
  for (const match of home.html.matchAll(/href="([^"#]+)"/gi)) {
    try {
      const link = new URL(match[1], site);
      if (link.hostname.replace(/^www\./, "") === site.hostname.replace(/^www\./, "") && wanted.test(link.pathname)) {
        links.add(link.origin + link.pathname);
      }
    } catch {
      // Ignore malformed hrefs.
    }
  }

  const sections = [`# ${site.href}\n${home.text}`];
  for (const link of [...links].slice(0, 4)) {
    const page = await fetchPage(new URL(link)).catch(() => null);
    if (page) sections.push(`# ${link}\n${page.text}`);
  }
  return sections.join("\n\n").slice(0, MAX_TEXT_CHARS);
}
