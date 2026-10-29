"use client";

import { Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteBusiness, reanalyzeBusiness, setBusinessRunning } from "../../actions";

/** Re-renders the page every few seconds while the agent is still analyzing. */
export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(timer);
  }, [active, router]);
  return null;
}

export function DeleteCampaignButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="btn-quiet text-danger"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete "${name}"? Its buyer types, people and conversations are removed permanently.`)) return;
        startTransition(() => deleteBusiness(id));
      }}
    >
      <Trash2 size={16} aria-hidden="true" />
      {pending ? "Deleting…" : "Delete campaign"}
    </button>
  );
}

export function StopProspectButton({ onStop }: { onStop: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="btn-secondary !min-h-9"
      disabled={pending}
      onClick={() => {
        if (!confirm("Stop all further emails to this person? Their conversation is kept.")) return;
        startTransition(() => onStop());
      }}
    >
      {pending ? "Stopping…" : "Stop emailing"}
    </button>
  );
}

export function RunControls({ id, status }: { id: string; status: string }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const running = status === "running";
  const analyzing = status === "analyzing";

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <button
          className="btn-secondary"
          disabled={pending || analyzing}
          onClick={() => {
            if (!confirm("Analyze the website again? Buyer types that haven't sent any emails will be replaced.")) return;
            startTransition(async () => {
              const result = await reanalyzeBusiness(id);
              setError(result?.error);
            });
          }}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Analyze again
        </button>
        <button
          className={running ? "btn-secondary" : "btn-primary"}
          disabled={pending || analyzing}
          onClick={() =>
            startTransition(async () => {
              const result = await setBusinessRunning(id, !running);
              setError(result?.error);
            })
          }
        >
          {running ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          {pending ? (running ? "Pausing…" : "Starting…") : running ? "Pause agent" : "Start agent"}
        </button>
      </div>
      {error && (
        <p role="alert" className="max-w-sm text-sm text-danger sm:text-right">
          {error}{" "}
          {error.includes("Settings") && <a href="/app/settings" className="font-semibold underline">Open Settings</a>}
          {error.includes("credits") && <a href="/app/billing" className="font-semibold underline">Add credits</a>}
        </p>
      )}
    </div>
  );
}
