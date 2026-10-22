import { z } from "zod";
import type { Currency, CurrencyCatalogue } from "../../shared/contracts.js";
import { Cache } from "./cache.js";
import type { JsonFetcher } from "./http.js";
import { CURRENCY_ROUTES } from "./routes.js";

const excluded = new Set(["XAU", "XAG", "XPD", "XPT", "XXX", "XTS", "XDR", "XSU", "XUA"]);
const isoCodes = Intl.supportedValuesOf("currency").filter((code) => !excluded.has(code));
const names = new Intl.DisplayNames(["en"], { type: "currency" });

function currency(code: string, remoteName?: string): Currency {
  const name = names.of(code);
  return {
    code,
    // ISO names avoid collisions with cryptocurrencies in the external catalogue.
    name: name && name !== code ? name : remoteName?.trim() || code,
    symbol: new Intl.NumberFormat("en", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" })
      .formatToParts(0).find((part) => part.type === "currency")?.value ?? code,
  };
}

export function builtInCurrencies(): CurrencyCatalogue {
  return { currencies: isoCodes.map((code) => currency(code)), source: "built-in", fetchedAt: null };
}

export function createCurrencyCatalogue(http: JsonFetcher): () => Promise<CurrencyCatalogue> {
  const cache = new Cache<CurrencyCatalogue>(86_400_000, 1);
  return async () => {
    try {
      return await cache.get("catalogue", async () => {
        for (const endpoint of CURRENCY_ROUTES) {
          try {
            const data = z.record(z.string().max(120)).parse(await http("currencies", new URL(endpoint)));
            const currencies = isoCodes.filter((code) => Object.hasOwn(data, code.toLowerCase()))
              .map((code) => currency(code, data[code.toLowerCase()]));
            if (!currencies.some((item) => item.code === "USD") || !currencies.some((item) => item.code === "KES")) continue;
            return { currencies, source: "currency-api", fetchedAt: new Date().toISOString() };
          } catch { /* Try the documented fallback before using built-in ISO data. */ }
        }
        throw new Error("Currency catalogue unavailable");
      });
    } catch {
      return builtInCurrencies();
    }
  };
}
