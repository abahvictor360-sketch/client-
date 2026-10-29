"use client";

import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { dismissOnboarding } from "./actions";

export type OnboardingStep = { id: string; label: string; hint: string; href: string; done: boolean };

/** Floating "Get started" checklist; ticks itself off from real account state. */
export function GetStarted({ steps }: { steps: OnboardingStep[] }) {
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hiding, startHide] = useTransition();
  useEffect(() => setOpen(false), [pathname]);
  if (!next) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3 z-30 w-[min(22rem,calc(100vw-1.5rem))] lg:bottom-5 lg:right-5">
      {open && (
        <section id="get-started-panel" aria-labelledby="get-started-title" className="mb-2 overflow-hidden rounded-[20px] bg-surface shadow-[var(--shadow-float)] ring-1 ring-line">
          <div className="flex items-start justify-between gap-3 border-b border-line p-4">
            <div>
              <h2 id="get-started-title" className="text-lg">Get started</h2>
              <p className="text-sm text-muted">{done} of {steps.length} done. Each step ticks itself off.</p>
            </div>
            <button
              type="button"
              className="btn-quiet !min-h-9 !px-2"
              disabled={hiding}
              onClick={() => startHide(() => dismissOnboarding())}
              aria-label="Hide the checklist"
              title="Hide the checklist"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <ol className="max-h-[55vh] overflow-y-auto p-2">
            {steps.map((s, i) => (
              <li key={s.id}>
                <Link
                  href={s.href}
                  className={`flex items-start gap-3 rounded-[12px] p-2.5 hover:bg-surface-2 ${s.id === next.id ? "bg-teal-soft/40" : ""}`}
                >
                  <span
                    className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                      s.done ? "bg-teal text-white dark:text-[#0b1f1b]" : "ring-1 ring-line text-muted"
                    }`}
                  >
                    {s.done ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-medium ${s.done ? "text-muted line-through" : ""}`}>{s.label}</span>
                    {!s.done && <span className="block text-xs text-muted">{s.hint}</span>}
                  </span>
                  <span className="sr-only">{s.done ? "(done)" : "(to do)"}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="get-started-panel"
        className="ml-auto flex min-h-12 w-full items-center gap-3 rounded-full bg-gradient-to-b from-teal to-teal-strong px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(35,127,111,0.7)] dark:text-[#0b1f1b] lg:w-auto"
      >
        <span>Get started</span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/30 lg:w-24 lg:flex-none" aria-hidden="true">
          <span className="block h-full rounded-full bg-white" style={{ width: `${(done / steps.length) * 100}%` }} />
        </span>
        <span className="tabular-nums">{done} of {steps.length}</span>
        {open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronUp size={16} aria-hidden="true" />}
      </button>
    </div>
  );
}
