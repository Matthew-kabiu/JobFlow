import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, RotateCcw } from "lucide-react";
import { apiClient } from "@/lib/api/apiClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { Currency } from "../../../shared/contracts";

const popular = ["USD", "KES", "EUR", "GBP", "ZAR", "CAD", "AUD"];
const displayNames = new Intl.DisplayNames(["en"], { type: "currency" });
const initialCurrencies: Currency[] = popular.map((code) => ({
  code, name: displayNames.of(code) ?? code,
  symbol: new Intl.NumberFormat("en", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((part) => part.type === "currency")?.value ?? code,
}));

export default function CurrencyPicker({ id, value, onChange }: { id: string; value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["currency-catalogue"], queryFn: ({ signal }) => apiClient.currencies(signal),
    staleTime: 86_400_000, retry: false,
  });
  const currencies = useMemo(() => [...(data?.currencies ?? initialCurrencies)].sort((a, b) => {
    const rank = (code: string) => { const index = popular.indexOf(code); return index < 0 ? popular.length : index; };
    return rank(a.code) - rank(b.code) || a.name.localeCompare(b.name);
  }), [data]);
  const selected = currencies.find((currency) => currency.code === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button id={id} type="button" role="combobox" aria-label="Currency" aria-expanded={open}
          className="app-select-trigger currency-trigger" title={`${value} · ${selected?.name ?? displayNames.of(value) ?? value}`}>
          <span className="currency-selected"><strong>{value}</strong><span className="currency-trigger-name">{selected?.name ?? displayNames.of(value)}</span><span className="currency-trigger-symbol">{selected?.symbol !== value ? selected?.symbol : ""}</span></span>
          <ChevronsUpDown size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="currency-popover" align="start" sideOffset={6} aria-label="Choose currency">
        <Command label="Search currencies">
          <CommandInput aria-label="Search currencies" placeholder="Search currency or code…" maxLength={80} />
          <CommandList>
            <CommandEmpty>No matching currencies.</CommandEmpty>
            <CommandGroup heading="Currency · code · symbol">
              {currencies.map((currency) => (
                <CommandItem key={currency.code} value={`${currency.code} ${currency.name} ${currency.symbol}`}
                  onSelect={() => { onChange(currency.code); setOpen(false); }} data-current={currency.code === value}
                  className="currency-option data-[selected='true']:bg-accent/10 data-[selected=true]:text-foreground">
                  <span className="currency-option-code">{currency.code}</span>
                  <span className="currency-option-name">{currency.name}</span>
                  <span className="currency-option-symbol">{currency.symbol !== currency.code ? currency.symbol : ""}</span>
                  <Check size={14} className={currency.code === value ? "currency-check" : "currency-check-inactive"} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="currency-catalogue-note" role="status">
          {isPending ? "Loading full currency catalogue…" : data?.source === "currency-api" ? "Free Currency API · cached daily" : "Built-in currency catalogue"}
          {(isError || data?.source === "built-in") && <button type="button" onClick={() => void refetch()} title="Retry loading currency catalogue"><RotateCcw size={12} />Retry</button>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
