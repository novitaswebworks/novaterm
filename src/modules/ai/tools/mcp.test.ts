import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDynamicMcpTools } from "./mcp";
import { useMcpStore } from "@/modules/mcp/mcpStore";

describe("buildDynamicMcpTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("converts discovered MCP tools into executable AI tools", async () => {
    const mockCallTool = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "neon-table-data" }],
      isError: false,
    });

    vi.spyOn(useMcpStore, "getState").mockReturnValue({
      getAvailableTools: () => [
        {
          serverId: "neon-postgres",
          serverName: "Neon Postgres",
          tool: {
            name: "read_query",
            description: "Run read-only query",
            inputSchema: {
              type: "object",
              properties: { query: { type: "string" } },
              required: ["query"],
            },
          },
        },
      ],
      callTool: mockCallTool,
    } as unknown as ReturnType<typeof useMcpStore.getState>);

    const tools = buildDynamicMcpTools();
    expect(tools["mcp_neon_postgres_read_query"]).toBeDefined();

    const mcpTool = tools["mcp_neon_postgres_read_query"];
    expect(mcpTool.description).toContain("[MCP: Neon Postgres]");

    // Execute the dynamic tool
    if (mcpTool.execute) {
      const result = await (mcpTool.execute as (args: unknown, opts: unknown) => Promise<unknown>)(
        { query: "SELECT * FROM users;" },
        {} as unknown,
      );
      expect(mockCallTool).toHaveBeenCalledWith("neon-postgres", "read_query", {
        query: "SELECT * FROM users;",
      });
      expect(result).toEqual({ result: "neon-table-data" });
    }
  });
});
