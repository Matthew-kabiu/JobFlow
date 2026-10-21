import type { SearchFilters, SearchResult } from "@/lib/job-types";
import { ROUTES } from "@/lib/routes";

const messages: Record<string, string> = {
  INVALID_SEARCH: "Check your search fields and salary range, then try again.",
  RATE_LIMITED: "Too many searches. Please wait a minute before trying again.",
  PROVIDERS_UNAVAILABLE: "The job sources are temporarily unavailable. Please try again later.",
};

export class ApiClientError extends Error {}

class ApiClient {
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
