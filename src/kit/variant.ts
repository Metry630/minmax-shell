import { useEffect, useState } from "react";

import { posthogClient } from "./analytics";

/**
 * The variant of a PostHog multivariate flag this browser is assigned to, for A/B tests inside a game
 * (PostHog randomises; the anon id keeps it stable across days). Undefined until flags load, so a
 * caller can hold back the tested element rather than flash the wrong one. `fallback` covers no key
 * (Lovable preview, forks), flags that failed to load, and boolean flags. Reading the flag sends
 * PostHog's $feature_flag_called, which is what its experiment results count as exposure.
 */
export function useVariant(flag: string, fallback = "control"): string | undefined {
  const [variant, setVariant] = useState<string>();

  useEffect(() => {
    const client = posthogClient();
    if (!client) {
      setVariant(fallback);
      return;
    }
    let live = true;
    let unsubscribe: (() => void) | undefined;
    void client.then((ph) => {
      if (!live) return;
      // Fires at once if flags are already loaded, and again whenever they change.
      unsubscribe = ph.onFeatureFlags(() => {
        const value = ph.getFeatureFlag(flag);
        setVariant(typeof value === "string" ? value : fallback);
      });
    });
    return () => {
      live = false;
      unsubscribe?.();
    };
  }, [flag, fallback]);

  return variant;
}
