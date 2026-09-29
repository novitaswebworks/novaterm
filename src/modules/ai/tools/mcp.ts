import { jsonSchema, tool, type Tool } from "ai";
import { useMcpStore } from "@/modules/mcp/mcpStore";

export function buildDynamicMcpTools(): Record<string, Tool> {
  const toolsRecord: Record<string, Tool> = {};
  const activeTools = useMcpStore.getState().getAvailableTools();

  for (const { serverId, serverName, tool: mcpTool } of activeTools) {
    const cleanServer = serverId.replace(/[^a-zA-Z0-9_]/g, "_");
    const cleanTool = mcpTool.name.replace(/[^a-zA-Z0-9_]/g, "_");
    const toolIdentifier = `mcp_${cleanServer}_${cleanTool}`;

    const schema =
      mcpTool.inputSchema && typeof mcpTool.inputSchema === "object"
        ? mcpTool.inputSchema
        : { type: "object", properties: {} };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schemaObj = jsonSchema(schema as any);

    toolsRecord[toolIdentifier] = tool({
      description: `[MCP: ${serverName}] ${mcpTool.description || mcpTool.name}`,
      inputSchema: schemaObj,
      execute: async (args: unknown) => {
        try {
          const safeArgs =
            args && typeof args === "object"
              ? (args as Record<string, unknown>)
              : {};
          const res = await useMcpStore
            .getState()
            .callTool(serverId, mcpTool.name, safeArgs);
          if (res.isError) {
            const errText =
              res.content.map((c) => c.text || "").join("\n") ||
              "MCP tool returned an error";
            return { error: errText };
          }
          const text = res.content.map((c) => c.text || "").join("\n");
          return { result: text || "Success" };
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    });
  }

  return toolsRecord;
}
