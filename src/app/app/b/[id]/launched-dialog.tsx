"use client";

import { ArrowRight, Check, Clock, Mail, MessageSquare, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

function Skeleton({ w }: { w: string }) {
  return <span className={`block h-2 rounded-full bg-surface-2 ${w}`} />;
}

const CARDS = [
  {
    icon: Search,
    title: "Finding your leads",
    body: "We search our B2B database for people who match your buyer types. They show up on the People page as we find them.",
    visual: (
      <ul className="space-y-2.5">
        {[true, true, false].map((done, i) => (
          <li key={i} className="flex items-center gap-2.5">
            <span className="h-7 w-7 shrink-0 rounded-full bg-surface-2" />
            <span className="flex-1 space-y-1.5"><Skeleton w="w-20" /><Skeleton w="w-14" /></span>
            {done ? (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-teal text-white dark:text-[#0b1f1b]"><Check size={12} strokeWidth={3} /></span>
            ) : (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-teal motion-reduce:animate-none" />
            )}
          </li>
        ))}
      </ul>
    ),
  },
  {
    icon: Mail,
    title: "Sent from your own domain",
    body: "Each email is written for one person and sent from your verified domain, a few at a time, so your inbox reputation stays healthy.",
    visual: (
      <div className="space-y-2.5 font-mono text-xs">
        <p className="flex gap-2"><span className="text-muted">From:</span><Skeleton w="mt-1 w-20" /></p>
        <p className="flex gap-2 border-t border-line pt-2.5"><span className="text-muted">Subject:</span><Skeleton w="mt-1 w-16" /></p>
        <div className="space-y-1.5 border-t border-line pt-2.5"><Skeleton w="w-full" /><Skeleton w="w-4/5" /></div>
      </div>
    ),
  },
  {
    icon: Clock,
    title: "During working hours",
    body: "We send on weekdays between 8:00 and 18:00 in your timezone, spread across the day rather than all at once.",
    visual: (
      <ul className="space-y-2.5">
        {["09:12", "11:40", "15:05"].map((t) => (
          <li key={t} className="flex items-center gap-2.5">
            <span className="h-7 w-7 shrink-0 rounded-full bg-surface-2" />
            <span className="flex-1"><Skeleton w="w-16" /></span>
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-xs tabular-nums">{t}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    icon: MessageSquare,
    title: "Replies land in your Inbox",
    body: "The agent answers questions and books meetings. We also email you when a lead shows real interest.",
    visual: (
      <div className="space-y-2">
        {["Interested", "Wants a meeting"].map((label) => (
          <div key={label} className="rounded-xl border-l-2 border-teal bg-surface p-2.5 shadow-[var(--shadow-float)] ring-1 ring-line">
            <span className="pill bg-teal-soft text-teal-ink">{label}</span>
            <div className="mt-2 space-y-1.5"><Skeleton w="w-full" /><Skeleton w="w-2/3" /></div>
          </div>
        ))}
      </div>
    ),
  },
];

/** Shown once, right after a campaign launches. */
export function LaunchedDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const close = () => {
    ref.current?.close();
    router.replace(pathname, { scroll: false });
  };

  return (
    <dialog
      ref={ref}
      onCancel={close}
      aria-labelledby="launched-title"
      className="m-auto w-[min(72rem,calc(100%-1.5rem))] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-[28px] bg-surface p-5 text-ink shadow-[var(--shadow-float)] ring-1 ring-line backdrop:bg-black/40 sm:p-8"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="pill bg-teal-soft text-teal-ink">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" aria-hidden="true" />
          Live
        </span>
        <h2 id="launched-title" className="text-2xl sm:text-3xl">
          Campaign launched. <span className="text-muted">We take it from here.</span>
        </h2>
      </div>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map(({ icon: Icon, title, body, visual }) => (
          <li key={title} className="flex flex-col rounded-[20px] p-4 ring-1 ring-line">
            <p className="flex items-start gap-2 font-semibold">
              <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              {title}
            </p>
            <p className="mt-2 text-sm text-muted">{body}</p>
            <div className="mt-auto pt-5" aria-hidden="true">
              <div className="rounded-2xl bg-canvas p-3.5 ring-1 ring-line">{visual}</div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex justify-end">
        <button className="btn-primary" onClick={close} autoFocus>
          Got it, let&rsquo;s go <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </dialog>
  );
}
