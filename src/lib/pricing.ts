// What the agent charges against the user's credit balance.
export const PRICE_PER_EMAIL_CENTS = 4;
export const SIGNUP_CREDITS_CENTS = 3000;
export const TOP_UP_OPTIONS_CENTS = [2000, 5000, 10000, 25000];

/** "$30" for whole dollars, "$0.04" otherwise. */
export function formatUsd(cents: number) {
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars.toLocaleString("en-US") : dollars.toFixed(2)}`;
}
