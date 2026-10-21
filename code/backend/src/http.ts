import type { ProviderId } from "../../shared/contracts.js";

export type JsonFetcher = (provider: ProviderId, url: URL, headers?: Record<string, string>) => Promise<unknown>;

/** Global per-provider budgets protect free allowances even across different search queries. */
export function createJsonFetcher(fetcher: typeof fetch = fetch, now = Date.now): JsonFetcher {
  const budgets = new Map<string, { minute: number[]; day: number[] }>();
  return async (provider, url, headers = {}) => {
    const time = now();
    const budget = budgets.get(provider) ?? { minute: [], day: [] };
    budget.minute = budget.minute.filter((at) => at > time - 60_000);
    budget.day = budget.day.filter((at) => at > time - 86_400_000);
    if (budget.minute.length >= 30 || budget.day.length >= 500) throw new Error("Provider budget reached");
    budget.minute.push(time);
    budget.day.push(time);
    budgets.set(provider, budget);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetcher(url, {
        headers: { Accept: "application/json", ...headers },
        signal: controller.signal,
        redirect: "error",
      });
      if (!response.ok || !response.body) throw new Error("Provider unavailable");
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 8_000_000) throw new Error("Provider response too large");
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
    } finally {
      clearTimeout(timer);
    }
  };
}
