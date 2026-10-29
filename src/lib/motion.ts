/** Stagger delay for the nth item in a scroll-revealed list. */
export function revealDelay(i: number, step = 90) {
  return { "--reveal-delay": `${i * step}ms` } as React.CSSProperties;
}
