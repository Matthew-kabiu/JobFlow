import { Briefcase, Github } from "lucide-react";
import { useRuntimeConfig } from "@/lib/config/runtime-config";

const Navbar = () => {
  const config = useRuntimeConfig();
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="container mx-auto flex h-12 items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2 text-foreground">
          <Briefcase className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <span className="text-sm font-semibold tracking-tight">
            JobFlow
          </span>
        </a>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="hidden sm:inline">Jobs from multiple sources</span>
          {config.repoUrl && <a
            href={config.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="GitHub"
          >
            <Github className="h-4 w-4" strokeWidth={1.5} />
          </a>}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
