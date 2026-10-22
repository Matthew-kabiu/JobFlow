import type { LucideIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string; icon?: LucideIcon }[];
  className?: string;
}

export function AppSelect({ id, label, value, onChange, options, className = "" }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={label} className={`app-select-trigger ${className}`}><SelectValue /></SelectTrigger>
      <SelectContent className="app-select-content" position="popper" sideOffset={6}>
        {options.map(({ value: option, label: name, icon: Icon }) => (
          <SelectItem key={option} value={option} textValue={name} className="app-select-item" title={name}>
            <span className="app-select-label">{Icon && <Icon size={15} strokeWidth={1.5} />}<span>{name}</span></span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
