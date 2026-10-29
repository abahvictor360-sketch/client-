"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Registers the service worker (production only). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}

/**
 * "Install app": uses the browser's install prompt where available (Android,
 * desktop Chrome/Edge) and explains Add to Home Screen on iPhone and iPad.
 */
export function InstallApp({ className = "" }: { className?: string }) {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    setInstalled(Boolean(standalone));
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!event && !ios)) return null;

  return (
    <div className={className}>
      <button
        type="button"
        className="flex min-h-10 w-full items-center gap-2.5 rounded-[10px] px-3 text-[15px] text-muted hover:bg-surface-2 hover:text-ink"
        aria-expanded={ios ? showHelp : undefined}
        onClick={async () => {
          if (event) {
            await event.prompt();
            await event.userChoice;
            setEvent(null);
          } else setShowHelp((v) => !v);
        }}
      >
        <Download size={17} aria-hidden="true" />
        Install app
      </button>
      {showHelp && (
        <p className="mx-3 mt-1 rounded-[12px] bg-surface p-3 text-sm text-muted ring-1 ring-line">
          Tap <Share size={14} className="inline align-[-2px]" aria-label="Share" /> in Safari, then <span className="font-medium text-ink">Add to Home Screen</span>.
        </p>
      )}
    </div>
  );
}
