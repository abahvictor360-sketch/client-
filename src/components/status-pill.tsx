// Status always shows its name next to the dot, so meaning never relies on color alone.
const tone: Record<string, string> = {
  booked: "bg-dawn-soft text-dawn-ink",
  meeting_confirm: "bg-dawn-soft text-dawn-ink",
  running: "bg-success-soft text-success",
  scaling: "bg-success-soft text-success",
  working: "bg-success-soft text-success",
  interested: "bg-success-soft text-success",
  meeting_request: "bg-success-soft text-success",
  question: "bg-success-soft text-success",
  analyzing: "bg-dawn-soft text-dawn-ink",
  failed: "bg-surface-2 text-danger",
  bounced: "bg-surface-2 text-danger",
  unsubscribe: "bg-surface-2 text-danger",
  unsubscribed: "bg-surface-2 text-danger",
};

const labels: Record<string, string> = {
  analyzing: "Analyzing",
  ready: "Ready to start",
  running: "Running",
  paused: "Paused",
  failed: "Needs attention",
  new: "Queued",
  meeting_request: "Wants a meeting",
  meeting_confirm: "Confirmed a time",
  out_of_office: "Out of office",
  not_interested: "Not interested",
  wrong_person: "Wrong person",
};

export function StatusPill({ status: raw }: { status: string | null | undefined }) {
  const status = raw ?? "unknown";
  const label = labels[status] ?? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
  return (
    <span className={`pill ${tone[status] ?? "bg-surface-2 text-muted"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
