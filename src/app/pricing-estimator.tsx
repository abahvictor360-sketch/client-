"use client";

import { useId, useState } from "react";

const WEEKDAYS_PER_MONTH = 21.7;

/** Lets visitors turn a daily email volume into a monthly cost. */
export function PricingEstimator({ pricePerEmailCents }: { pricePerEmailCents: number }) {
  const id = useId();
  const [perDay, setPerDay] = useState(40);
  const monthly = (perDay * WEEKDAYS_PER_MONTH * pricePerEmailCents) / 100;
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="panel p-6 sm:p-8">
      <label htmlFor={id} className="flex items-baseline justify-between gap-4">
        <span className="font-medium">Emails per weekday</span>
        <span className="font-display text-2xl font-semibold tabular-nums">{perDay}</span>
      </label>
      <input
        id={id}
        type="range"
        min={10}
        max={200}
        step={10}
        value={perDay}
        onChange={(e) => setPerDay(Number(e.target.value))}
        className="mt-4 h-11 w-full cursor-pointer accent-[var(--ink)]"
      />
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-6">
        <div>
          <p className="text-sm text-muted">About</p>
          <p className="font-display text-4xl font-semibold tabular-nums" aria-live="polite">
            {money.format(monthly)}
            <span className="text-base font-normal text-muted"> a month</span>
          </p>
        </div>
        <p className="max-w-56 text-sm text-muted">
          {(perDay * WEEKDAYS_PER_MONTH).toFixed(0)} emails at ${(pricePerEmailCents / 100).toFixed(2)} each. You set a
          daily cap, so it never spends more.
        </p>
      </div>
    </div>
  );
}
