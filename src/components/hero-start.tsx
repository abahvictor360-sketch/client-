"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";

/** Faint lines that converge on the input from both sides, dotted with a few "leads". */
function FlowLines() {
  // Start heights at the outer edges; every line bends toward the input's mid-height (y=130).
  const ys = [-40, 10, 55, 95, 130, 165, 205, 250, 300];
  const left = ys.map((y) => `M0 ${y} C 260 ${y}, 330 130, 520 130`);
  const right = ys.map((y) => `M1400 ${y} C 1140 ${y}, 1070 130, 880 130`);
  const dots: [number, number, boolean][] = [
    [150, 36, false], [300, 84, true], [380, 112, true], [440, 122, false], [360, 160, false], [210, 214, true],
    [470, 134, true], [90, 120, false], [960, 120, true], [1030, 96, true], [1110, 60, false], [1000, 152, false],
    [1160, 200, true], [1300, 128, false], [930, 136, false],
  ];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1400 260"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute left-1/2 top-[38px] -z-10 hidden h-[260px] w-[1400px] max-w-[100vw] -translate-x-1/2 -translate-y-1/2 [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)] md:block"
    >
      {[...left, ...right].map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
      {dots.map(([x, y, teal], i) => (
        <rect key={i} x={x} y={y} width="4" height="4" fill={teal ? "var(--teal)" : "var(--muted)"} opacity={teal ? 0.9 : 0.35} />
      ))}
    </svg>
  );
}

/** Hero entry point: paste a website, or describe the business when there isn't one. */
export function HeroStart() {
  const [noWebsite, setNoWebsite] = useState(false);
  const field = noWebsite ? "about" : "website";

  return (
    <div className="relative isolate mx-auto mt-10 w-full max-w-[52rem]">
      <FlowLines />
      <form action="/signup" className="mx-auto max-w-[44rem]">
        <label htmlFor="hero-start" className="sr-only">
          {noWebsite ? "Describe what you sell" : "Your website"}
        </label>
        <div className="flex items-center gap-2 rounded-[22px] border-[3px] border-ink bg-surface p-2 pl-5 shadow-[var(--shadow-float)] transition-shadow focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--focus)_25%,transparent)]">
          <input
            key={field}
            id="hero-start"
            name={field}
            required
            minLength={noWebsite ? 15 : undefined}
            maxLength={noWebsite ? 500 : undefined}
            inputMode={noWebsite ? "text" : "url"}
            autoComplete={noWebsite ? "off" : "url"}
            spellCheck={noWebsite ? undefined : false}
            placeholder={
              noWebsite
                ? "Describe what you sell, e.g. wholesale silk flowers for event planners…"
                : "Paste your website, e.g. acme.com…"
            }
            className="min-h-12 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted sm:text-lg"
          />
          <button
            aria-label="Start"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-muted transition-colors hover:bg-teal hover:text-white focus-visible:bg-teal focus-visible:text-white"
          >
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
      </form>
      <button
        type="button"
        onClick={() => setNoWebsite((v) => !v)}
        className="btn-quiet mx-auto mt-3"
        aria-controls="hero-start"
      >
        {noWebsite ? "I have a website" : "I don't have a website"}
      </button>
    </div>
  );
}
