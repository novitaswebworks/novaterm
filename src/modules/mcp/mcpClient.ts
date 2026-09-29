import { Channel, invoke } from "@tauri-apps/api/core";
import type {
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponse,
  McpExitInfo,
  McpServerConfig,
  McpServerStatus,
  McpTool,
} from "./types";

export type McpClientCallbacks = {
  onStatusChange: (status: McpServerStatus, error?: string) => void;
  onToolsChange: (tools: McpTool[]) => void;
};

export class McpClient {
  readonly serverId: string;
  private config: McpServerConfig;
  private callbacks: McpClientCallbacks;
  private nextId = 1;
  private pending = new Map<
    number | string,
    {
      resolve: (value: unknown) => void;
      reject: (err: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private closed = false;
  private discoveredTools: McpTool[] = [];

  constructor(config: McpServerConfig, callbacks: McpClientCallbacks) {
    this.serverId = config.id;
    this.config = config;
    this.callbacks = callbacks;
  }

  get tools(): McpTool[] {
    return this.discoveredTools;
  }

  async start(): Promise<void> {
    this.closed = false;
    this.callbacks.onStatusChange("connecting");

    const onMessage = new Channel<string>();
    onMessage.onmessage = (payload) => {
      this.handleIncoming(payload);
    };

    const onExit = new Channel<McpExitInfo>();
    onExit.onmessage = (exit) => {
      if (this.closed) return;
      this.cleanupPending(new Error(exit.reason || "MCP server exited"));
      const errMsg =
        exit.reason ||
        (exit.code !== null && exit.code !== 0
          ? `Server exited with code ${exit.code}`
          : "Server disconnected");
      this.callbacks.onStatusChange("error", errMsg);
    };

    try {
      await invoke<number>("mcp_spawn", {
        serverId: this.serverId,
        command: this.config.command,
        args: this.config.args ?? [],
        env: this.config.env ?? {},
        cwd: this.config.cwd ?? null,
        onMessage,
        onExit,
      });

      // Handshake: initialize
      await this.sendRequest(
        "initialize",
        {
          protocolVersion: "2024-11-05",
          capabilities: {
            roots: { listChanged: false },
          },
          clientInfo: {
            name: "NovaTerm",
            version: "2.0.0",
          },
        },
        15000,
      );

      // Handshake: initialized notification
      await this.sendNotification("notifications/initialized", {});

      // Query tools
      await this.refreshTools();
      this.callbacks.onStatusChange("connected");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.callbacks.onStatusChange("error", msg);
      this.stop().catch(() => {});
      throw err;
    }
  }

  async refreshTools(): Promise<McpTool[]> {
    try {
      const response = await this.sendRequest<{ tools?: McpTool[] }>(
        "tools/list",
        {},
        10000,
      );
      this.discoveredTools = response?.tools ?? [];
      this.callbacks.onToolsChange(this.discoveredTools);
      return this.discoveredTools;
    } catch (err) {
      console.warn(`[MCP ${this.serverId}] Failed to list tools:`, err);
      return this.discoveredTools;
    }
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ content: Array<{ type: string; text?: string }>; isError?: boolean }> {
    const res = await this.sendRequest<{
      content?: Array<{ type: string; text?: string }>;
      isError?: boolean;
    }>(
      "tools/call",
      {
        name,
        arguments: args,
      },
      60000,
    );

    return {
      content: res?.content ?? [{ type: "text", text: JSON.stringify(res) }],
      isError: res?.isError ?? false,
    };
  }

  async sendRequest<T>(
    method: string,
    params?: unknown,
    timeoutMs = 30000,
  ): Promise<T> {
    if (this.closed) {
      throw new Error(`MCP client ${this.serverId} is closed`);
    }

    const id = this.nextId++;
    const payload: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(
            `MCP request '${method}' timed out after ${timeoutMs / 1000}s`,
          ),
        );
      }, timeoutMs);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });

      this.sendRaw(JSON.stringify(payload) + "\n").catch((err) => {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      });
    });
  }

  async sendNotification(method: string, params?: unknown): Promise<void> {
    if (this.closed) return;
    const payload: JsonRpcNotification = {
      jsonrpc: "2.0",
      method,
      params,
    };
    await this.sendRaw(JSON.stringify(payload) + "\n");
  }

  private async sendRaw(message: string): Promise<void> {
    await invoke("mcp_send", {
      serverId: this.serverId,
      payload: message,
    });
  }

  private handleIncoming(data: string) {
    const lines = data.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as
          | JsonRpcResponse
          | JsonRpcRequest
          | JsonRpcNotification;

        // Check if it is a response to our pending request
        if ("id" in parsed && parsed.id != null && !("method" in parsed)) {
          const handler = this.pending.get(parsed.id);
          if (handler) {
            clearTimeout(handler.timer);
            this.pending.delete(parsed.id);
            if ("error" in parsed && parsed.error) {
              handler.reject(
                new Error(parsed.error.message || "MCP JSON-RPC error"),
              );
            } else {
              handler.resolve(parsed.result);
            }
          }
          continue;
        }

        // Server request to client (e.g. ping)
        if ("id" in parsed && parsed.id != null && "method" in parsed) {
          if (parsed.method === "ping") {
            this.sendRaw(
              JSON.stringify({ jsonrpc: "2.0", id: parsed.id, result: {} }) +
                "\n",
            ).catch(() => {});
          } else {
            this.sendRaw(
              JSON.stringify({
                jsonrpc: "2.0",
                id: parsed.id,
                error: { code: -32601, message: "Method not found" },
              }) + "\n",
            ).catch(() => {});
          }
          continue;
        }

        // Notification from server
        if ("method" in parsed && !("id" in parsed)) {
          if (parsed.method === "notifications/tools/list_changed") {
            this.refreshTools().catch(() => {});
          }
        }
      } catch (err) {
        console.warn(`[MCP ${this.serverId}] Failed to parse incoming JSON:`, err);
      }
    }
  }

  private cleanupPending(err: Error) {
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(err);
    }
    this.pending.clear();
  }

  async stop(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.cleanupPending(new Error("MCP server stopped"));
    try {
      await invoke("mcp_kill", { serverId: this.serverId });
    } catch {
      // Ignore if already dead
    }
    this.callbacks.onStatusChange("disconnected");
  }
}
