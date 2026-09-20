"use client";

import { useEffect, useState } from "react";

type Flash = { message: string; type: "success" | "error" };

function readAndClearFlash(): Flash | null {
  const match = document.cookie.split("; ").find((c) => c.startsWith("flash="));
  if (!match) return null;
  document.cookie = "flash=; path=/; max-age=0";
  try {
    return JSON.parse(decodeURIComponent(match.slice("flash=".length))) as Flash;
  } catch {
    return null;
  }
}

export function FlashToast() {
  const [flash, setFlash] = useState<Flash | null>(null);

  // Polling a cookie is cheap, and it's the only way to notice a message set
  // by a Server Action that completed in place (no navigation to re-trigger a check).
  useEffect(() => {
    const check = () => {
      const next = readAndClearFlash();
      if (next) setFlash(next);
    };
    check();
    const interval = setInterval(check, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!flash) return;
    const timeout = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(timeout);
  }, [flash]);

  if (!flash) return null;

  const isError = flash.type === "error";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-20 z-50 flex md:bottom-4 print:hidden max-w-sm items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-sm"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${isError ? "bg-danger" : "bg-success"}`} />
      <p className="text-sm text-heading">{flash.message}</p>
      <button
        type="button"
        onClick={() => setFlash(null)}
        aria-label="Dismiss"
        className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted hover:text-heading"
      >
        ×
      </button>
    </div>
  );
}
