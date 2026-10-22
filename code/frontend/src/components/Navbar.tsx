import { ArrowUpRight, BriefcaseBusiness, Github, Laptop, Moon, Sun } from "lucide-react";
import { useRuntimeConfig } from "@/lib/config/runtime-config";
import { useTheme } from "next-themes";
import { AppSelect } from "@/components/ui/app-select";

export default function Navbar({ onHome, hasResults = false }: { onHome?: () => void; hasResults?: boolean }) {
  const config = useRuntimeConfig();
  const { theme, setTheme } = useTheme();
  return (
    <header className="site-header">
      <nav className="app-shell nav-inner" aria-label="Main navigation">
        <a href="/" className="brand" onClick={(event) => { if (onHome) { event.preventDefault(); onHome(); } }}>
          <span className="brand-mark"><BriefcaseBusiness size={20} strokeWidth={1.7} /></span>
          <span>JobFlow<span className="brand-dot">.</span></span>
        </a>
        <div className="nav-links">
          <a href="#job-search" className="nav-active">Find jobs</a>
          <a href={hasResults ? "#source-coverage" : "#job-sources"}>Our sources</a>
          <AppSelect label="Appearance" value={theme ?? "system"} onChange={setTheme} className="theme-select"
            options={[{ value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }, { value: "system", label: "System", icon: Laptop }]} />
          {config.repoUrl && <a href={config.repoUrl} target="_blank" rel="noopener noreferrer" className="nav-repo" aria-label="GitHub">
            <Github size={16} strokeWidth={1.5} /><span>Open source</span><ArrowUpRight size={13} />
          </a>}
        </div>
      </nav>
    </header>
  );
}
