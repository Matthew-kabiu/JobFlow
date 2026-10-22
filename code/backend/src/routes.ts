export const ROUTES = {
  health: "/health",
  config: "/api/v1/config",
  currencies: "/api/v1/currencies",
  providers: "/api/v1/providers",
  search: "/api/v1/jobs/search",
} as const;

export const CURRENCY_ROUTES = [
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.json",
  "https://latest.currency-api.pages.dev/v1/currencies.json",
] as const;

// Provider origins are fixed, never supplied by a browser request.
export const PROVIDER_ROUTES = {
  himalayas: "https://himalayas.app/jobs/api/search",
  jobicy: "https://jobicy.com/api/jobs",
  reliefweb: "https://api.reliefweb.int/v2/jobs",
} as const;
