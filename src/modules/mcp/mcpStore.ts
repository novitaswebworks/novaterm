import { create } from "zustand";
import { setMcpServers } from "@/modules/settings/store";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { McpClient } from "./mcpClient";
import type {
  McpServerConfig,
  McpServerState,
  McpServerStatus,
  McpTool,
} from "./types";

type McpStoreState = {
  servers: Record<string, McpServerState>;
  initialized: boolean;
  init: () => Promise<void>;
  startServer: (id: string) => Promise<void>;
  stopServer: (id: string) => Promise<void>;
  restartServer: (id: string) => Promise<void>;
  addServer: (config: McpServerConfig) => Promise<void>;
  removeServer: (id: string) => Promise<void>;
  toggleServer: (id: string, enabled: boolean) => Promise<void>;
  updateServer: (
    id: string,
    updates: Partial<McpServerConfig>,
  ) => Promise<void>;
  callTool: (
    serverId: string,
    toolName: string,
    args: Record<string, unknown>,
  ) => Promise<{
    content: Array<{ type: string; text?: string }>;
    isError?: boolean;
  }>;
  getAvailableTools: () => Array<{
    serverId: string;
    serverName: string;
    tool: McpTool;
  }>;
};

const activeClients = new Map<string, McpClient>();

export const useMcpStore = create<McpStoreState>((set, get) => ({
  servers: {},
  initialized: false,

  init: async () => {
    if (get().initialized) return;

    // Hydrate preferences store if not yet ready
    await usePreferencesStore.getState().init();
    const configured = usePreferencesStore.getState().mcpServers || [];

    const initialMap: Record<string, McpServerState> = {};
    for (const cfg of configured) {
      initialMap[cfg.id] = {
        config: cfg,
        status: "disconnected",
        tools: [],
      };
    }

    set({ servers: initialMap, initialized: true });

    // Auto-start enabled servers
    for (const cfg of configured) {
      if (cfg.enabled) {
        get().startServer(cfg.id).catch((err) => {
          console.warn(`[MCP] Failed to auto-start ${cfg.id}:`, err);
        });
      }
    }
  },

  startServer: async (id: string) => {
    const current = get().servers[id];
    if (!current) return;

    // Terminate existing client if any
    const existing = activeClients.get(id);
    if (existing) {
      await existing.stop().catch(() => {});
      activeClients.delete(id);
    }

    const client = new McpClient(current.config, {
      onStatusChange: (status: McpServerStatus, error?: string) => {
        set((s) => {
          const srv = s.servers[id];
          if (!srv) return s;
          return {
            servers: {
              ...s.servers,
              [id]: {
                ...srv,
                status,
                error: error ?? (status === "connected" ? undefined : srv.error),
              },
            },
          };
        });
      },
      onToolsChange: (tools: McpTool[]) => {
        set((s) => {
          const srv = s.servers[id];
          if (!srv) return s;
          return {
            servers: {
              ...s.servers,
              [id]: {
                ...srv,
                tools,
              },
            },
          };
        });
      },
    });

    activeClients.set(id, client);

    try {
      await client.start();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set((s) => {
        const srv = s.servers[id];
        if (!srv) return s;
        return {
          servers: {
            ...s.servers,
            [id]: {
              ...srv,
              status: "error",
              error: msg,
            },
          },
        };
      });
    }
  },

  stopServer: async (id: string) => {
    const client = activeClients.get(id);
    if (client) {
      await client.stop().catch(() => {});
      activeClients.delete(id);
    }
    set((s) => {
      const srv = s.servers[id];
      if (!srv) return s;
      return {
        servers: {
          ...s.servers,
          [id]: {
            ...srv,
            status: "disconnected",
            error: undefined,
          },
        },
      };
    });
  },

  restartServer: async (id: string) => {
    await get().stopServer(id);
    await get().startServer(id);
  },

  addServer: async (config: McpServerConfig) => {
    set((s) => ({
      servers: {
        ...s.servers,
        [config.id]: {
          config,
          status: "disconnected",
          tools: [],
        },
      },
    }));

    const currentConfigs = Object.values(get().servers).map((s) => s.config);
    await setMcpServers(currentConfigs);

    if (config.enabled) {
      await get().startServer(config.id);
    }
  },

  removeServer: async (id: string) => {
    await get().stopServer(id);
    set((s) => {
      const updated = { ...s.servers };
      delete updated[id];
      return { servers: updated };
    });

    const currentConfigs = Object.values(get().servers).map((s) => s.config);
    await setMcpServers(currentConfigs);
  },

  toggleServer: async (id: string, enabled: boolean) => {
    await get().updateServer(id, { enabled });
    if (enabled) {
      await get().startServer(id);
    } else {
      await get().stopServer(id);
    }
  },

  updateServer: async (id: string, updates: Partial<McpServerConfig>) => {
    set((s) => {
      const srv = s.servers[id];
      if (!srv) return s;
      return {
        servers: {
          ...s.servers,
          [id]: {
            ...srv,
            config: {
              ...srv.config,
              ...updates,
            },
          },
        },
      };
    });

    const currentConfigs = Object.values(get().servers).map((s) => s.config);
    await setMcpServers(currentConfigs);
  },

  callTool: async (
    serverId: string,
    toolName: string,
    args: Record<string, unknown>,
  ) => {
    const client = activeClients.get(serverId);
    if (!client) {
      throw new Error(`MCP server '${serverId}' is not currently running`);
    }
    return client.callTool(toolName, args);
  },

  getAvailableTools: () => {
    const out: Array<{
      serverId: string;
      serverName: string;
      tool: McpTool;
    }> = [];
    for (const srv of Object.values(get().servers)) {
      if (srv.status === "connected") {
        for (const t of srv.tools) {
          out.push({
            serverId: srv.config.id,
            serverName: srv.config.name,
            tool: t,
          });
        }
      }
    }
    return out;
  },
}));
