import type { SearchFilters, SearchResult } from "@/lib/job-types";
import { ROUTES } from "@/lib/routes";
import type { PublicConfig } from "../../../../shared/contracts";
import { z } from "zod";

const publicUrl = z.union([z.literal(""), z.string().url().refine((value) => {
  const url = new URL(value);
  return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
})]);
const publicConfigSchema = z.object({
  repoUrl: publicUrl, companyUrl: publicUrl, companyName: z.string().max(120), version: z.string().max(40),
});

const messages: Record<string, string> = {
  INVALID_SEARCH: "Check your search fields and salary range, then try again.",
  RATE_LIMITED: "Too many searches. Please wait a minute before trying again.",
  PROVIDERS_UNAVAILABLE: "The job sources are temporarily unavailable. Please try again later.",
};

export class ApiClientError extends Error {}

class ApiClient {
  async publicConfig(signal?: AbortSignal): Promise<PublicConfig> {
    try {
      const timeout = AbortSignal.timeout(8_000);
      const response = await fetch(ROUTES.api.config, {
        cache: "no-store", signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
      const body = await response.json();
      const parsed = publicConfigSchema.safeParse(body?.data);
      if (!response.ok || !body?.success || !parsed.success) throw new Error("Invalid configuration");
      return parsed.data;
    } catch {
      throw new ApiClientError("Could not load JobFlow configuration. Please try again.");
    }
  }

  async search(filters: SearchFilters, signal?: AbortSignal): Promise<SearchResult> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, 35_000);
    try {
      const response = await fetch(ROUTES.api.search, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters), signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new ApiClientError(messages[result?.error] ?? "Job search is unavailable. Please try again.");
      }
      if (!Array.isArray(result.data?.jobs) || !Array.isArray(result.data?.providers) || typeof result.data?.count !== "number") {
        throw new ApiClientError("The search response could not be read. Please try again.");
      }
      return result.data as SearchResult;
    } catch (error) {
      if (signal?.aborted) throw new DOMException("Search cancelled", "AbortError");
      if (error instanceof ApiClientError) throw error;
      throw new ApiClientError(controller.signal.aborted
        ? "Search took too long. Please try again."
        : "Could not reach JobFlow. Check your connection and try again.");
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }
}

export const apiClient = new ApiClient();
