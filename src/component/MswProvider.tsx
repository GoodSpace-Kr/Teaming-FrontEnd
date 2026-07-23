"use client";

import { useEffect, useState, type ReactNode } from "react";

const isMockingEnabled = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

async function unregisterAnyMockWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((r) => r.active?.scriptURL.includes("mockServiceWorker.js"))
      .map((r) => r.unregister())
  );
}

export default function MswProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isMockingEnabled);

  useEffect(() => {
    if (!isMockingEnabled) {
      unregisterAnyMockWorker();
      return;
    }

    let cancelled = false;
    import("@/mocks/browser").then(({ worker }) =>
      worker
        .start({ onUnhandledRequest: "bypass", serviceWorker: { url: "/mockServiceWorker.js" } })
        .then(() => {
          if (!cancelled) setReady(true);
        })
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
