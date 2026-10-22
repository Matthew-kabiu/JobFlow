import { act, renderHook, render as baseRender, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { apiClient } from "@/lib/api/apiClient";
import { useJobSearch } from "@/hooks/use-job-search";
import { COUNTRY_CODES, DEFAULT_FILTERS, type Job, type SearchResult } from "@/lib/job-types";
import { formatSalary, postedAgo } from "@/lib/job-display";
import JobDetailPanel from "@/components/JobDetailPanel";
import Index from "@/pages/Index";
import { RuntimeConfigProvider } from "@/context/runtime-config";

const job: Job = {
  id: "himalayas:1", title: "Engineer", company: "Example", location: "Kenya",
  description: "A role", category: "IT Jobs", contract_type: "contract", remote: true,
  eligibility: "Kenya; UTC +3", created: "2026-01-01T00:00:00Z",
  salary_min: 50, salary_max: 70, salary_currency: "USD", salary_period: "hourly",
  redirect_url: "https://himalayas.app/apply?utm_source=api",
  sources: [{ provider: "himalayas", name: "Himalayas", url: "https://himalayas.app/jobs/1", applyUrl: "https://himalayas.app/apply?utm_source=api" }],
};
const result: SearchResult = { jobs: [job], count: 1, page: 1, pageSize: 10, hasMore: false, partial: false, limited: true, providers: [], countLabel: "loaded matches" };

const clients: QueryClient[] = [];
function render(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return baseRender(<ThemeProvider attribute="class" defaultTheme="system" storageKey="jobflow-theme">
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  </ThemeProvider>);
}

beforeEach(() => {
  vi.spyOn(apiClient, "currencies").mockResolvedValue({ source: "currency-api", fetchedAt: "2026-01-01T00:00:00Z", currencies: [
    { code: "USD", name: "US Dollar", symbol: "$" }, { code: "KES", name: "Kenyan Shilling", symbol: "KSh" }, { code: "EUR", name: "Euro", symbol: "€" },
  ] });
});
afterEach(() => {
  cleanup(); clients.forEach((client) => client.clear()); clients.length = 0;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); document.documentElement.className = "";
});

async function chooseOption(label: string, option: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: option }));
}

it("runtime company and repository links render from the server response", async () => {
  vi.spyOn(apiClient, "publicConfig").mockResolvedValue({
    repoUrl: "https://example.org/runtime-repo", companyName: "Runtime deployment",
    companyUrl: "https://example.org/runtime-company", version: "1.0.0",
  });
  render(<RuntimeConfigProvider><Index /></RuntimeConfigProvider>);
  expect(await screen.findByRole("link", { name: "Runtime deployment" })).toHaveAttribute("href", "https://example.org/runtime-company");
  expect(screen.getAllByRole("link", { name: "GitHub" }).every((link) => link.getAttribute("href") === "https://example.org/runtime-repo")).toBe(true);
  expect(screen.getByText("· v1.0.0")).toBeInTheDocument();
});

it("configuration failure offers retry instead of booting with baked deployment values", async () => {
  vi.spyOn(apiClient, "publicConfig").mockRejectedValue(new Error("offline"));
  render(<RuntimeConfigProvider><Index /></RuntimeConfigProvider>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load JobFlow configuration");
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
});

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
  fireEvent.click(screen.getByText("Location & eligibility"));
  expect(screen.getByText(/Eligibility: Kenya; UTC \+3/)).toBeVisible();
  expect(screen.getByText(/USD 50 – 70 \/ hour/)).toBeInTheDocument();
});

it("salary display preserves pay units, tolerates unknown dates, and geography includes Kenya", () => {
  expect(formatSalary(job)).toBe("USD 50 – 70 / hour");
  expect(formatSalary({ ...job, salary_currency: undefined })).toBeNull();
  expect(postedAgo("")).toBe("Date not provided");
  expect(COUNTRY_CODES.find((country) => country.code === "ke")?.label).toBe("Kenya");
});

it("the default view contains job filters instead of the removed discovery and how-to sections", () => {
  render(<Index />);
  expect(screen.getByRole("heading", { name: "Job filters" })).toBeInTheDocument();
  expect(screen.queryByText("Where would you like to go next?")).not.toBeInTheDocument();
  expect(screen.queryByText("Less searching.")).not.toBeInTheDocument();
  for (const name of ["Sort by", "Category", "Job type", "Pay period"]) {
    expect(screen.getByRole("combobox", { name }).tagName).toBe("BUTTON");
  }
});

it("light and dark themes are selectable and persist independently of the search", async () => {
  render(<Index />);
  await chooseOption("Appearance", "Dark");
  await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
  expect(localStorage.getItem("jobflow-theme")).toBe("dark");
  await chooseOption("Appearance", "Light");
  await waitFor(() => expect(document.documentElement).toHaveClass("light"));
  expect(localStorage.getItem("jobflow-theme")).toBe("light");
});

it("currency picker searches codes/names and preserves the chosen currency in search requests", async () => {
  const search = vi.spyOn(apiClient, "search").mockResolvedValue(result);
  render(<Index />);
  fireEvent.click(screen.getByRole("combobox", { name: "Currency" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Search currencies" }), { target: { value: "Kenyan" } });
  fireEvent.click(await screen.findByRole("option", { name: /KES Kenyan Shilling/ }));
  expect(screen.getByRole("combobox", { name: "Currency" })).toHaveTextContent("KES");
  fireEvent.change(screen.getByRole("textbox", { name: "Minimum" }), { target: { value: "100" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  await waitFor(() => expect(search).toHaveBeenCalled());
  expect(search.mock.calls[0][0]).toMatchObject({ salaryCurrency: "KES", salaryMin: "100" });
});

it("reset restores query, geography, advanced filters and the default view without issuing another search", async () => {
  const search = vi.spyOn(apiClient, "search").mockResolvedValue(result);
  render(<Index />);
  fireEvent.change(screen.getByRole("textbox", { name: "Job title, keyword, or company" }), { target: { value: "engineer" } });
  fireEvent.change(screen.getByRole("textbox", { name: "City or region" }), { target: { value: "Nairobi" } });
  await chooseOption("Country", "Kenya");
  await chooseOption("Category", "IT Jobs");
  await chooseOption("Pay period", "Hour");
  fireEvent.change(screen.getByRole("textbox", { name: "Minimum" }), { target: { value: "100" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  await screen.findByRole("heading", { name: "1 loaded match" });
  fireEvent.click(screen.getAllByRole("button", { name: "Reset filters" })[0]);
  expect(screen.getByRole("textbox", { name: "Job title, keyword, or company" })).toHaveValue("");
  expect(screen.getByRole("textbox", { name: "City or region" })).toHaveValue("");
  expect(screen.getByRole("combobox", { name: "Country" })).toHaveTextContent("All countries");
  expect(screen.getByRole("combobox", { name: "Category" })).toHaveTextContent("All categories");
  expect(screen.getByRole("combobox", { name: "Pay period" })).toHaveTextContent("Year");
  expect(screen.getByRole("textbox", { name: "Minimum" })).toHaveValue("");
  expect(screen.getByRole("heading", { name: "Job filters" })).toBeInTheDocument();
  expect(search).toHaveBeenCalledTimes(1);
}, 15_000);

it("reset aborts a pending request and a late response cannot repopulate the landing view", async () => {
  let finish: (value: SearchResult) => void = () => {};
  const request = vi.spyOn(apiClient, "search").mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const hook = renderHook(() => useJobSearch());
  let pending: Promise<void>;
  act(() => { pending = hook.result.current.search(DEFAULT_FILTERS); });
  act(() => { hook.result.current.reset(); });
  await act(async () => { finish(result); await pending; });
  expect(request.mock.calls[0][1]?.aborted).toBe(true);
  expect(hook.result.current.result).toBeNull();
  expect(hook.result.current.isSearching).toBe(false);
  expect(hook.result.current.error).toBeNull();
});

it("source diagnostics retain refresh timestamps, limits and disabled-provider explanations in the disclosure", async () => {
  vi.spyOn(apiClient, "search").mockResolvedValue({ ...result, providers: [
    { id: "himalayas", name: "Himalayas", status: "ok", limited: true, fetchedAt: "2026-01-01T00:00:00Z" },
    { id: "reliefweb", name: "ReliefWeb", status: "disabled", limited: false, message: "Requires approved app name" },
  ] });
  render(<Index />);
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  const title = await screen.findByText("Source coverage");
  const details = title.closest("details")!;
  fireEvent.click(details.querySelector("summary")!);
  expect(within(details).getByText("Requires approved app name")).toBeVisible();
  expect(within(details).getByText(/Search covers a limited pool/)).toBeVisible();
  expect(details.querySelector("time")).toHaveAttribute("datetime", "2026-01-01T00:00:00Z");
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
