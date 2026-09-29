import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useChatStore } from "@/modules/ai/store/chatStore";

import type { McpServerConfig } from "@/modules/mcp/types";
import { useMcpStore } from "@/modules/mcp/mcpStore";

export type WorkspaceConfig = {
  tasks?: { name: string; command: string }[];
  openFiles?: string[];
  mcpServers?: Record<string, Omit<McpServerConfig, "id">> | McpServerConfig[];
};

export function useWorkspaceProvisioning(
  explorerRoot: string | null,
  openFileTab: (path: string, focus: boolean) => void
) {
  useEffect(() => {
    if (!explorerRoot) return;

    const seenKey = `provisioned:${explorerRoot}`;
    if (sessionStorage.getItem(seenKey)) return;

    const check = async () => {
      try {
        const path = `${explorerRoot}/novaterm.workspace.json`;
        await invoke("fs_stat", { path });

        const content = await invoke<string>("fs_read_file", { path });
        const config = JSON.parse(content) as WorkspaceConfig;
        
        const hasTasks = config.tasks && config.tasks.length > 0;
        const hasFiles = config.openFiles && config.openFiles.length > 0;
        const hasMcp = Boolean(config.mcpServers);

        if (!hasTasks && !hasFiles && !hasMcp) return;

        toast(`Workspace detected: ${explorerRoot.split(/[\\/]/).pop()}`, {
          description: "novaterm.workspace.json found. Would you like to initialize this workspace?",
          action: {
            label: "Initialize",
            onClick: () => {
              sessionStorage.setItem(seenKey, "true");

              if (hasFiles) {
                for (const file of config.openFiles!) {
                  openFileTab(`${explorerRoot}/${file}`, true);
                }
              }

              if (hasMcp && config.mcpServers) {
                const servers: McpServerConfig[] = Array.isArray(config.mcpServers)
                  ? config.mcpServers
                  : Object.entries(config.mcpServers).map(([id, srv]) => ({
                      id,
                      name: srv.name || id,
                      command: srv.command,
                      args: srv.args,
                      env: srv.env,
                      cwd: srv.cwd || explorerRoot,
                      enabled: srv.enabled ?? true,
                      description: srv.description,
                    }));
                for (const s of servers) {
                  void useMcpStore.getState().addServer(s);
                }
              }

              if (hasTasks) {
                const prompt = `Please set up my workspace by executing the following tasks:\n\n${config.tasks?.map((t) => `- **${t.name}**: \`${t.command}\``).join("\n")}\n\nYou can use the shell_bg_spawn or run_command tools to start these.`;
                useChatStore.getState().focusInput(prompt);
              }
            },
          },
          cancel: {
            label: "Dismiss",
            onClick: () => {
              sessionStorage.setItem(seenKey, "true");
            }
          },
          duration: 10000,
        });
      } catch (_e) {
      }
    };
    void check();
  }, [explorerRoot, openFileTab]);
}
