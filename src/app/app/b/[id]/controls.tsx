"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { reanalyzeBusiness, setBusinessRunning } from "../../actions";

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

export function RunControls({ id, status }: { id: string; status: string }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const running = status === "running";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          className="btn-secondary"
          disabled={pending || status === "analyzing"}
          onClick={() => startTransition(() => reanalyzeBusiness(id))}
        >
          Re-analyze
        </button>
        <button
          className={running ? "btn-secondary" : "btn-primary"}
          disabled={pending || status === "analyzing"}
          onClick={() =>
            startTransition(async () => {
              const result = await setBusinessRunning(id, !running);
              setError(result?.error);
            })
          }
        >
          {running ? "Pause agent" : "Start agent"}
        </button>
      </div>
      {error && <p className="max-w-xs text-right text-sm text-danger">{error}</p>}
    </div>
  );
}
