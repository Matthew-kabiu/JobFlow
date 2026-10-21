import { act, renderHook, render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api/apiClient";
import { useJobSearch } from "@/hooks/use-job-search";
import { COUNTRY_CODES, DEFAULT_FILTERS, type Job, type SearchResult } from "@/lib/job-types";
import { formatSalary, postedAgo } from "@/lib/job-display";
import JobDetailPanel from "@/components/JobDetailPanel";
import Index from "@/pages/Index";

const job: Job = {
  id: "himalayas:1", title: "Engineer", company: "Example", location: "Kenya",
  description: "A role", category: "IT Jobs", contract_type: "contract", remote: true,
  eligibility: "Kenya; UTC +3", created: "2026-01-01T00:00:00Z",
  salary_min: 50, salary_max: 70, salary_currency: "USD", salary_period: "hourly",
  redirect_url: "https://himalayas.app/apply?utm_source=api",
  sources: [{ provider: "himalayas", name: "Himalayas", url: "https://himalayas.app/jobs/1", applyUrl: "https://himalayas.app/apply?utm_source=api" }],
};
const result: SearchResult = { jobs: [job], count: 1, page: 1, pageSize: 10, hasMore: false, partial: false, limited: true, providers: [], countLabel: "loaded matches" };

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); cleanup(); });

describe("backend API client", () => {
  it("uses the same-origin backend route with the search contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: result })));
    vi.stubGlobal("fetch", fetchMock);
    expect(await apiClient.search(DEFAULT_FILTERS)).toEqual(result);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/jobs/search");
    expect(JSON.parse(options.body).country_code).toBe("all");
  });

  it("maps backend errors and never shows raw upstream errors or a demo success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: "UPSTREAM_SECRET" }), { status: 503 })));
    await expect(apiClient.search(DEFAULT_FILTERS)).rejects.toThrow("Job search is unavailable. Please try again.");
  });

  it("maps throttling into an actionable message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: "RATE_LIMITED" }), { status: 429 })));
    await expect(apiClient.search(DEFAULT_FILTERS)).rejects.toThrow("Please wait a minute");
  });
});

it("a late old search cannot overwrite newer search results", async () => {
  let finishOld: (value: SearchResult) => void = () => {};
  const mock = vi.spyOn(apiClient, "search");
  mock.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }));
  mock.mockResolvedValueOnce({ ...result, count: 2 });
  const hook = renderHook(() => useJobSearch());
  let first: Promise<void>;
  act(() => { first = hook.result.current.search(DEFAULT_FILTERS); });
  await act(async () => { await hook.result.current.search({ ...DEFAULT_FILTERS, keyword: "new" }); });
  await act(async () => { finishOld(result); await first; });
  expect(hook.result.current.result?.count).toBe(2);
  expect(hook.result.current.isSearching).toBe(false);
  expect(mock.mock.calls[0][1]?.aborted).toBe(true);
});

it("failed searches expose an error state rather than successful empty results", async () => {
  vi.spyOn(apiClient, "search").mockRejectedValue(new Error("Sources unavailable"));
  const hook = renderHook(() => useJobSearch());
  await act(async () => { await hook.result.current.search(DEFAULT_FILTERS); });
  expect(hook.result.current.result).toBeNull();
  expect(hook.result.current.error).toBe("Sources unavailable");
  expect(hook.result.current.isSearching).toBe(false);
});

it("job details retain the source's exact Apply link, attribution and eligibility", () => {
  render(<JobDetailPanel job={job} onClose={() => {}} />);
  expect(screen.getByRole("link", { name: "Apply via Himalayas" })).toHaveAttribute("href", job.sources[0].applyUrl);
  expect(screen.getByRole("link", { name: "Himalayas" })).toHaveAttribute("href", job.sources[0].url);
  expect(screen.getByText(/Eligibility: Kenya; UTC \+3/)).toBeInTheDocument();
  expect(screen.getByText(/USD 50 – USD 70 \/ hourly/)).toBeInTheDocument();
});

it("salary display preserves pay units, tolerates unknown dates, and geography includes Kenya", () => {
  expect(formatSalary(job)).toBe("USD 50 – USD 70 / hourly");
  expect(formatSalary({ ...job, salary_currency: undefined })).toBeNull();
  expect(postedAgo("")).toBe("Date not provided");
  expect(COUNTRY_CODES.find((country) => country.code === "ke")?.label).toBe("Kenya");
});

it("pagination retains the applied search rather than using unsubmitted draft filters", async () => {
  const mock = vi.spyOn(apiClient, "search");
  mock.mockResolvedValueOnce({ ...result, count: 20, hasMore: true });
  mock.mockResolvedValueOnce({ ...result, count: 20, page: 2 });
  render(<Index />);
  fireEvent.change(screen.getByRole("textbox", { name: "Job title, keyword, or company" }), { target: { value: "engineer" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  await screen.findByText(/20 loaded matches/);
  fireEvent.change(screen.getByRole("textbox", { name: "Job title, keyword, or company" }), { target: { value: "unsubmitted" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(mock).toHaveBeenCalledTimes(2));
  expect(mock.mock.calls[1][0]).toMatchObject({ keyword: "engineer", page: 2 });
});
