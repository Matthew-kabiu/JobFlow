import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api/apiClient";
import type { SearchFilters, SearchResult } from "@/lib/job-types";

export function useJobSearch() {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const search = useCallback(async (filters: SearchFilters) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setIsSearching(true);
    setError(null);
    try {
      const next = await apiClient.search(filters, controller.signal);
      if (!controller.signal.aborted) setResult(next);
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(failure instanceof Error ? failure.message : "Job search is unavailable.");
        setResult(null);
      }
    } finally {
      if (!controller.signal.aborted) setIsSearching(false);
    }
  }, []);

  return { result, isSearching, error, search };
}
