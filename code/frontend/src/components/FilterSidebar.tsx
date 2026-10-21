import { JOB_CATEGORIES, JOB_TYPES_FOR_UI, type SortOption } from "@/lib/job-types";
import { Button } from "@/components/ui/button";
import { RotateCcw, Search } from "lucide-react";

interface FilterSidebarProps {
  category: string;
  jobType: string;
  salaryMin: string;
  salaryMax: string;
  sort: SortOption;
  whatExclude: string;
  onCategoryChange: (v: string) => void;
  onJobTypeChange: (v: string) => void;
  onSalaryMinChange: (v: string) => void;
  onSalaryMaxChange: (v: string) => void;
  onSortChange: (v: SortOption) => void;
  onWhatExcludeChange: (v: string) => void;
  onClear: () => void;
  onApply: () => void;
  isSearching: boolean;
  salaryLabel: string;
}

const FilterSidebar = ({
  category,
  jobType,
  salaryMin,
  salaryMax,
  sort,
  whatExclude,
  onCategoryChange,
  onJobTypeChange,
  onSalaryMinChange,
  onSalaryMaxChange,
  onSortChange,
  onWhatExcludeChange,
  onClear,
  onApply,
  isSearching,
  salaryLabel,
}: FilterSidebarProps) => {
  const hasActiveFilters =
    category !== "all" ||
    jobType !== "all" ||
    salaryMin !== "" ||
    salaryMax !== "" ||
    sort !== "relevance" ||
    whatExclude !== "";

  return (
    <aside className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Filters
        </h2>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
            Clear
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <Section label="Sort by">
          <RadioGroup
            options={[
              { value: "relevance", label: "Relevance" },
              { value: "date", label: "Most Recent" },
              { value: "salary_asc", label: "Salary: Low to High" },
              { value: "salary_desc", label: "Salary: High to Low" },
            ]}
            value={sort}
            onChange={(v) => onSortChange(v as SortOption)}
          />
        </Section>

        <Section label="Category">
          <RadioGroup
            options={[
              { value: "all", label: "All categories" },
              ...JOB_CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
            value={category}
            onChange={onCategoryChange}
          />
        </Section>

        <Section label="Job type">
          <RadioGroup
            options={[
              { value: "all", label: "All types" },
              ...JOB_TYPES_FOR_UI.map((t) => ({ value: t.value, label: t.label })),
            ]}
            value={jobType}
            onChange={onJobTypeChange}
          />
        </Section>

        <Section label="Exclude keyword">
          <input
            type="text"
            placeholder="e.g. Java"
            value={whatExclude}
            onChange={(e) => onWhatExcludeChange(e.target.value)}
            className="w-full rounded border border-border bg-secondary px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
          />
        </Section>

        <Section label={`Salary (${salaryLabel})`}>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Min"
              value={salaryMin}
              onChange={(e) => onSalaryMinChange(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded border border-border bg-secondary px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder="Max"
              value={salaryMax}
              onChange={(e) => onSalaryMaxChange(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded border border-border bg-secondary px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </Section>
        <Button onClick={onApply} disabled={isSearching} className="w-full gap-2">
          <Search className="h-4 w-4" />Apply filters
        </Button>
        <p className="text-xs text-muted-foreground">Changes apply when you search. Salary filters compare only the displayed currency and pay period.</p>
      </div>
    </aside>
  );
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-[11px] font-medium text-muted-foreground">{label}</h3>
      {children}
    </div>
  );
}

function RadioGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-0.5">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs transition-colors ${
            value === opt.value
              ? "bg-secondary text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <input
            type="radio"
            name={options.map((option) => option.value).join("-")}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="h-3 w-3 accent-foreground"
          />
          <span aria-hidden="true"
            className={`hidden ${
              value === opt.value
                ? "border-foreground"
                : "border-muted-foreground/40"
            }`}
          >
            {value === opt.value && (
              <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
            )}
          </span>
          {opt.label}
        </label>
      ))}
    </div>
  );
}

export default FilterSidebar;
