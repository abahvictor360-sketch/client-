// What the agent charges against the user's credit balance.
export const PRICE_PER_EMAIL_CENTS = 4;
// New accounts get a free trial: no card, no subscription.
export const TRIAL_DAYS = 3;
export const TOP_UP_OPTIONS_CENTS = [2000, 5000, 10000, 25000];

/** "$30" for whole dollars, "$0.04" otherwise. */
export function formatUsd(cents: number) {
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars.toLocaleString("en-US") : dollars.toFixed(2)}`;
}

export interface TrialStatus {
  active: boolean;
  /** Whole days left, rounded up; 0 once the trial is over. */
  daysLeft: number;
  endsAt: Date;
}

export function trialStatus(trialEndsAt: string | null | undefined, now = Date.now()): TrialStatus {
  const endsAt = new Date(trialEndsAt ?? 0);
  const msLeft = endsAt.getTime() - now;
  return { active: msLeft > 0, daysLeft: msLeft > 0 ? Math.ceil(msLeft / 86_400_000) : 0, endsAt };
}
