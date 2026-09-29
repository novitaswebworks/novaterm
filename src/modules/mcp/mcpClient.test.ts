import { beforeEach, describe, expect, it, vi } from "vitest";
import { McpClient } from "./mcpClient";
import type { McpServerConfig, McpServerStatus, McpTool } from "./types";

let mockMessageChannel: { onmessage?: (data: string) => void } | null = null;
let mockExitChannel: { onmessage?: (data: unknown) => void } | null = null;
let mockSentMessages: string[] = [];

vi.mock("@tauri-apps/api/core", () => {
  let count = 0;
  return {
    Channel: vi.fn().mockImplementation(function (this: { onmessage?: (data: unknown) => void }) {
      count++;
      if (count % 2 === 1) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        mockMessageChannel = this;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        mockExitChannel = this;
      }
      return this;
    }),
    invoke: vi.fn().mockImplementation(async (cmd: string, args: Record<string, unknown>) => {
      if (cmd === "mcp_spawn") {
        return 12345;
      }
      if (cmd === "mcp_send") {
        const msg = String(args.payload ?? args.message);
        mockSentMessages.push(msg);
        const parsed = JSON.parse(msg.trim()) as { id?: number; method?: string };
        if (parsed.id !== undefined && parsed.method === "initialize") {
          setTimeout(() => {
            mockMessageChannel?.onmessage?.(
              JSON.stringify({
                jsonrpc: "2.0",
                id: parsed.id,
                result: {
                  protocolVersion: "2024-11-05",
                  capabilities: { tools: {} },
                  serverInfo: { name: "test-server", version: "1.0.0" },
                },
              }) + "\n",
            );
          }, 5);
        }
        if (parsed.id !== undefined && parsed.method === "tools/list") {
          setTimeout(() => {
            mockMessageChannel?.onmessage?.(
              JSON.stringify({
                jsonrpc: "2.0",
                id: parsed.id,
                result: {
                  tools: [
                    {
                      name: "test_query",
                      description: "Execute a test query",
                      inputSchema: { type: "object", properties: { sql: { type: "string" } } },
                    },
                  ],
                },
              }) + "\n",
            );
          }, 5);
        }
        if (parsed.id !== undefined && parsed.method === "tools/call") {
          setTimeout(() => {
            mockMessageChannel?.onmessage?.(
              JSON.stringify({
                jsonrpc: "2.0",
                id: parsed.id,
                result: {
                  content: [{ type: "text", text: "query-result-ok" }],
                  isError: false,
                },
              }) + "\n",
            );
          }, 5);
        }
        return;
      }
      if (cmd === "mcp_kill") {
        return;
      }
      return;
    }),
  };
});

describe("McpClient", () => {
  const config: McpServerConfig = {
    id: "test-server",
    name: "Test Server",
    command: "node",
    args: ["server.js"],
    enabled: true,
  };

  beforeEach(() => {
    mockSentMessages = [];
    mockMessageChannel = null;
    mockExitChannel = null;
    vi.clearAllMocks();
  });

  it("completes initialize handshake and discovers tools", async () => {
    const statuses: McpServerStatus[] = [];
    let discoveredTools: McpTool[] = [];

    const client = new McpClient(config, {
      onStatusChange: (s) => statuses.push(s),
      onToolsChange: (t) => {
        discoveredTools = t;
      },
    });

    await client.start();

    expect(statuses).toContain("connecting");
    expect(statuses).toContain("connected");
    expect(discoveredTools).toHaveLength(1);
    expect(discoveredTools[0].name).toBe("test_query");
    expect(client.tools).toEqual(discoveredTools);

    expect(mockSentMessages.some((m) => m.includes('"method":"initialize"'))).toBe(true);
    expect(mockSentMessages.some((m) => m.includes('"method":"notifications/initialized"'))).toBe(true);
    expect(mockSentMessages.some((m) => m.includes('"method":"tools/list"'))).toBe(true);

    await client.stop();
    expect(statuses).toContain("disconnected");
  });

  it("invokes tools via tools/call and returns content", async () => {
    const client = new McpClient(config, {
      onStatusChange: () => {},
      onToolsChange: () => {},
    });

    await client.start();

    const result = await client.callTool("test_query", { sql: "SELECT 1" });
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toBe("query-result-ok");

    await client.stop();
  });

  it("handles server exit cleanly", async () => {
    const statuses: McpServerStatus[] = [];
    const client = new McpClient(config, {
      onStatusChange: (s) => statuses.push(s),
      onToolsChange: () => {},
    });

    await client.start();
    mockExitChannel?.onmessage?.({
      code: 1,
      stderrTail: "fatal error",
      reason: "Process exited",
    });
    expect(statuses).toContain("error");
  });
});
