import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMcpStore } from "./mcpStore";
import type { McpServerConfig } from "./types";

vi.mock("@/modules/settings/store", () => ({
  setMcpServers: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/settings/preferences", () => ({
  usePreferencesStore: {
    getState: () => ({
      init: vi.fn().mockResolvedValue(undefined),
      mcpServers: [],
    }),
  },
}));

vi.mock("./mcpClient", () => ({
  McpClient: vi.fn().mockImplementation(function (
    config: McpServerConfig,
    callbacks: {
      onStatusChange: (s: string) => void;
      onToolsChange: (t: unknown[]) => void;
    },
  ) {
    return {
      serverId: config.id,
      tools: [
        {
          name: "docker_ps",
          description: "List containers",
          inputSchema: { type: "object", properties: {} },
        },
      ],
      start: vi.fn().mockImplementation(async () => {
        callbacks.onStatusChange("connected");
        callbacks.onToolsChange([
          {
            name: "docker_ps",
            description: "List containers",
            inputSchema: { type: "object", properties: {} },
          },
        ]);
      }),
      stop: vi.fn().mockResolvedValue(undefined),
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "container-list" }],
        isError: false,
      }),
    };
  }),
}));

describe("mcpStore", () => {
  beforeEach(() => {
    useMcpStore.setState({ servers: {}, initialized: false });
    vi.clearAllMocks();
  });

  it("adds and starts an enabled server", async () => {
    const config: McpServerConfig = {
      id: "docker-local",
      name: "Docker Local",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-docker"],
      enabled: true,
    };

    await useMcpStore.getState().addServer(config);

    const servers = useMcpStore.getState().servers;
    expect(servers["docker-local"]).toBeDefined();
    expect(servers["docker-local"].status).toBe("connected");
    expect(servers["docker-local"].tools).toHaveLength(1);
    expect(servers["docker-local"].tools[0].name).toBe("docker_ps");

    const available = useMcpStore.getState().getAvailableTools();
    expect(available).toHaveLength(1);
    expect(available[0].tool.name).toBe("docker_ps");
  });

  it("toggles server on and off", async () => {
    const config: McpServerConfig = {
      id: "docker-local",
      name: "Docker Local",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-docker"],
      enabled: true,
    };

    await useMcpStore.getState().addServer(config);
    expect(useMcpStore.getState().servers["docker-local"].status).toBe("connected");

    await useMcpStore.getState().toggleServer("docker-local", false);
    expect(useMcpStore.getState().servers["docker-local"].status).toBe("disconnected");

    await useMcpStore.getState().toggleServer("docker-local", true);
    expect(useMcpStore.getState().servers["docker-local"].status).toBe("connected");
  });

  it("removes server cleanly", async () => {
    const config: McpServerConfig = {
      id: "docker-local",
      name: "Docker Local",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-docker"],
      enabled: true,
    };

    await useMcpStore.getState().addServer(config);
    expect(useMcpStore.getState().servers["docker-local"]).toBeDefined();

    await useMcpStore.getState().removeServer("docker-local");
    expect(useMcpStore.getState().servers["docker-local"]).toBeUndefined();
    expect(useMcpStore.getState().getAvailableTools()).toHaveLength(0);
  });
});
