const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const dateLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** A clean upper bound for the y-axis (1, 2, 5, 10, 20, 50…). */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 5, 10].map((m) => m * pow).find((n) => n >= value)!;
}

/** Single-series daily bar chart with a hover tooltip per bar and a table for screen readers. */
export function DailyChart({ title, total, unit, days }: {
  title: string;
  total: number;
  unit: string;
  days: { day: string; value: number }[];
}) {
  const max = niceMax(Math.max(0, ...days.map((d) => d.value)));
  const showEvery = days.length > 14 ? 5 : 1;

  return (
    <section className="panel p-5 sm:p-6" aria-label={title}>
      <p className="eyebrow">{title}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{total.toLocaleString("en-US")}</p>

      <div className="mt-5 flex gap-2" aria-hidden="true">
        <div className="flex h-36 flex-col justify-between pb-6 text-right text-[11px] tabular-nums text-muted">
          <span>{max}</span>
          <span>{max / 2}</span>
          <span>0</span>
        </div>
        <div className="relative flex-1">
          {/* Recessive gridlines at max, half and zero. */}
          <div className="pointer-events-none absolute inset-x-0 top-[6px] border-t border-dashed border-line" />
          <div className="pointer-events-none absolute inset-x-0 top-[calc((100%-1.5rem)/2)] border-t border-dashed border-line" />
          <div className="pointer-events-none absolute inset-x-0 bottom-6 border-t border-line" />
          <div className="flex h-36 items-end gap-[2px]">
            {days.map((d, i) => {
              const date = new Date(`${d.day}T00:00:00Z`);
              return (
                <div key={d.day} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                  <div className="flex w-full flex-1 items-end justify-center pt-[6px] pb-6">
                    <div
                      className="w-full max-w-7 rounded-t-[4px] bg-teal transition-opacity group-hover:opacity-80"
                      style={{ height: d.value ? `${Math.max(3, (d.value / max) * 100)}%` : "2px", opacity: d.value ? undefined : 0.35 }}
                    />
                  </div>
                  <span className={`absolute bottom-0 text-[11px] text-muted ${i % showEvery === 0 || i === days.length - 1 ? "" : "invisible"}`}>
                    {days.length > 14 ? dateLabel.format(date) : dayLabel.format(date)}
                  </span>
                  <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs text-surface shadow-[var(--shadow-float)] group-hover:block">
                    {dateLabel.format(date)}: <span className="font-semibold tabular-nums">{d.value}</span> {unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>{title} per day</caption>
        <thead>
          <tr><th scope="col">Day</th><th scope="col">{unit}</th></tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}><td>{dateLabel.format(new Date(`${d.day}T00:00:00Z`))}</td><td>{d.value}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
