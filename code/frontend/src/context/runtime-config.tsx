import { useEffect, useState, type ReactNode } from "react";
import type { PublicConfig } from "../../../shared/contracts";
import { apiClient } from "@/lib/api/apiClient";
import { RuntimeConfigContext } from "@/lib/config/runtime-config";
import { RotateCcw } from "lucide-react";

export function RuntimeConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    apiClient.publicConfig(controller.signal).then((value) => {
      if (!controller.signal.aborted) setConfig(value);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [attempt]);
  if (failed) return <main className="p-8" role="alert">
    <p>Could not load JobFlow configuration.</p>
    <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-3 inline-flex items-center gap-2 underline"><RotateCcw className="h-4 w-4" />Try again</button>
  </main>;
  if (!config) return <main className="p-8" role="status">Loading JobFlow…</main>;
  return <RuntimeConfigContext.Provider value={config}>{children}</RuntimeConfigContext.Provider>;
}
