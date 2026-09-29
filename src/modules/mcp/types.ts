export type McpServerConfig = {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  enabled: boolean;
  description?: string;
};

export type McpServerStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type McpTool = {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
  };
};

export type McpServerState = {
  config: McpServerConfig;
  status: McpServerStatus;
  pid?: number;
  error?: string;
  tools: McpTool[];
};

export type McpTemplate = {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  description: string;
};

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: unknown;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

export type JsonRpcNotification = {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
};

export type McpExitInfo = {
  code: number | null;
  stderrTail: string;
  reason: string | null;
};

export type McpRegistrySource = {
  id: string;
  name: string;
  description: string;
  url: string;
  isDefault?: boolean;
};

export type McpRegistryCategory =
  | "all"
  | "databases"
  | "devops"
  | "security"
  | "productivity"
  | "research"
  | "browser";

export type McpRegistryParam = {
  key: string;
  label: string;
  description: string;
  target: "arg" | "env";
  placeholder?: string;
  defaultValue?: string;
};

export type McpRegistryItem = {
  id: string;
  name: string;
  description: string;
  category: McpRegistryCategory;
  command: string;
  args: string[];
  env?: Record<string, string>;
  sourceId: string;
  author?: string;
  npmPackage?: string;
  homepage?: string;
  params?: McpRegistryParam[];
};
