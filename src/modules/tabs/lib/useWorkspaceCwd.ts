import { useCallback, useEffect, useMemo, useRef } from "react";
import { useWorkspaceEnvStore, workspaceScopeKey } from "@/modules/workspace";
import type { Tab } from "./useTabs";

type Result = {
  explorerRoot: string | null;
  inheritedCwdForNewTab: () => string | undefined;
};

export function useWorkspaceCwd(
  activeTab: Tab | undefined,
  tabs: Tab[],
  home: string | null,
): Result {
  const workspaceEnv = useWorkspaceEnvStore((s) => s.env);
  const scopeKey = workspaceScopeKey(workspaceEnv);
  const lastTerminalCwd = useRef<string | null>(null);
  const lastScopeKey = useRef<string>(scopeKey);

  if (lastScopeKey.current !== scopeKey) {
    lastScopeKey.current = scopeKey;
    lastTerminalCwd.current = null;
  }

  useEffect(() => {
    if (activeTab?.kind === "terminal" && activeTab.cwd) {
      lastTerminalCwd.current = activeTab.cwd;
    }
  }, [activeTab]);

  const explorerRoot = useMemo<string | null>(() => {
    if (activeTab?.kind === "terminal" && activeTab.cwd) return activeTab.cwd;
    if (lastTerminalCwd.current) return lastTerminalCwd.current;
    const anyTerm = tabs.find((t) => t.kind === "terminal" && t.cwd);
    if (anyTerm?.kind === "terminal" && anyTerm.cwd) return anyTerm.cwd;
    return home;
  }, [activeTab, tabs, home, scopeKey]);

  const inheritedCwdForNewTab = useCallback((): string | undefined => {
    if (activeTab?.kind === "terminal" && activeTab.cwd) return activeTab.cwd;
    // Editor tabs inherit the last terminal cwd (or workspace home), not
    // the file folder so opening a new terminal does not hijack context.
    return lastTerminalCwd.current ?? home ?? undefined;
  }, [activeTab, home]);

  return { explorerRoot, inheritedCwdForNewTab };
}
