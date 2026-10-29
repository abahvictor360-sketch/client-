import { CalendarCheck } from "lucide-react";

const entries = [
  { time: "22:04", text: "Read larksilk.com and four competitor sites" },
  { time: "22:11", text: "Picked six buyer types. Event designers fit best at 92%" },
  { time: "23:30", text: "Found 48 decision makers with verified work emails" },
  { time: "01:15", text: "Sent 31 emails, each opening with something true about the recipient" },
  { time: "06:52", text: "Dana Okafor at Tupelo Honey replied: “Interesting, can you do Tuesday 2pm?”" },
];

/** The hero's signature element: what the agent did overnight, ending in a booked call. */
export function OvernightLog() {
  return (
    <figure className="relative overflow-hidden rounded-[var(--radius-panel)] bg-night p-5 text-night-ink shadow-[0_30px_60px_-30px_rgba(20,26,46,0.6)] ring-1 ring-white/10 sm:p-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(ellipse_at_bottom,rgba(242,169,59,0.35),transparent_70%)]"
      />
      <figcaption className="relative flex items-center justify-between gap-3 text-sm">
        <span className="font-display text-lg font-semibold">Last night</span>
        <span className="inline-flex items-center gap-2 text-night-muted">
          <span className="h-2 w-2 rounded-full bg-dawn" aria-hidden="true" />
          Agent on shift
        </span>
      </figcaption>
      <ol className="relative mt-5 space-y-4 border-l border-night-ink/15 pl-5">
        {entries.map((entry, i) => (
          <li key={entry.time} className="log-entry relative" style={{ animationDelay: `${150 + i * 260}ms` }}>
            <span aria-hidden="true" className="absolute -left-[25px] top-2 h-2 w-2 rounded-full bg-night-muted" />
            <time className="block text-xs tabular-nums text-night-muted">{entry.time}</time>
            <p className="text-[15px] leading-snug">{entry.text}</p>
          </li>
        ))}
        <li className="log-entry relative" style={{ animationDelay: `${150 + entries.length * 260 + 200}ms` }}>
          <span aria-hidden="true" className="absolute -left-[27px] top-2 h-3 w-3 rounded-full bg-dawn ring-4 ring-dawn/25" />
          <time className="block text-xs tabular-nums text-night-muted">06:53</time>
          <p className="mt-1 inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-dawn px-3 py-2 font-semibold text-[#141a2e]">
            <CalendarCheck size={18} aria-hidden="true" />
            Meeting booked, Tuesday 14:00
          </p>
        </li>
      </ol>
      <p className="relative mt-6 text-xs text-night-muted">Example run for larksilk.com, a silk flower wholesaler</p>
    </figure>
  );
}
