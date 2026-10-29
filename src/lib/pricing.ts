// What the agent charges against the user's credit balance.
export const PRICE_PER_EMAIL_CENTS = 4;
export const SIGNUP_CREDITS_CENTS = 3000;
export const TOP_UP_OPTIONS_CENTS = [2000, 5000, 10000, 25000];

export function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
