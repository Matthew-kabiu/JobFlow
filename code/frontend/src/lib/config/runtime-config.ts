import { createContext, useContext } from "react";
import type { PublicConfig } from "../../../../shared/contracts";

export const RuntimeConfigContext = createContext<PublicConfig>({ repoUrl: "", companyName: "JobFlow", companyUrl: "", version: "" });
export function useRuntimeConfig() { return useContext(RuntimeConfigContext); }
