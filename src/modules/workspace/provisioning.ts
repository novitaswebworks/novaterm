import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useChatStore } from "@/modules/ai/store/chatStore";

export type WorkspaceConfig = {
  tasks?: { name: string; command: string }[];
  openFiles?: string[];
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
        
        if (!hasTasks && !hasFiles) return;

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
              
              if (hasTasks) {
                const prompt = `Please set up my workspace by executing the following tasks:\n\n${config.tasks!.map(t => `- **${t.name}**: \`${t.command}\``).join('\n')}\n\nYou can use the shell_bg_spawn or run_command tools to start these.`;
                useChatStore.getState().focusInput(prompt);
              }
            }
          },
          cancel: {
            label: "Dismiss",
            onClick: () => {
              sessionStorage.setItem(seenKey, "true");
            }
          },
          duration: 10000,
        });
      } catch (e) {
      }
    };
    void check();
  }, [explorerRoot, openFileTab]);
}
