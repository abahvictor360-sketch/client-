const styles: Record<string, string> = {
  running: "bg-accent-soft text-accent",
  scaling: "bg-accent-soft text-accent",
  working: "bg-accent-soft text-accent",
  booked: "bg-accent-soft text-accent",
  interested: "bg-accent-soft text-accent",
  ready: "bg-surface-2 text-fg",
  testing: "bg-surface-2 text-fg",
  contacted: "bg-surface-2 text-fg",
  analyzing: "bg-surface-2 text-warn",
  paused: "bg-surface-2 text-muted",
  exhausted: "bg-surface-2 text-muted",
  failed: "bg-surface-2 text-danger",
  bounced: "bg-surface-2 text-danger",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`pill ${styles[status] ?? "bg-surface-2 text-muted"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace(/_/g, " ")}
    </span>
  );
}
