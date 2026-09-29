import type {
  McpRegistryCategory,
  McpRegistryItem,
  McpRegistrySource,
} from "./types";

export const DEFAULT_REGISTRY_SOURCES: McpRegistrySource[] = [
  {
    id: "mcpservers-org",
    name: "mcpservers.org (Community Directory)",
    description: "Official community directory indexing hundreds of verified Model Context Protocol servers.",
    url: "https://mcpservers.org",
    isDefault: true,
  },
  {
    id: "anthropic-official",
    name: "Anthropic Official MCP Registry",
    description: "Core reference MCP servers maintained by the Model Context Protocol organization.",
    url: "https://github.com/modelcontextprotocol/servers",
    isDefault: false,
  },
];

export const REGISTRY_CATEGORIES: Array<{
  id: McpRegistryCategory;
  label: string;
}> = [
  { id: "all", label: "All Categories" },
  { id: "databases", label: "Databases" },
  { id: "devops", label: "DevOps and Cloud" },
  { id: "security", label: "Security" },
  { id: "productivity", label: "Productivity and Git" },
  { id: "research", label: "Docs and Research" },
  { id: "browser", label: "Browser and Web" },
];

export const CURATED_MCP_CATALOG: McpRegistryItem[] = [
  // Databases
  {
    id: "neon-postgres",
    name: "Neon / PostgreSQL",
    description: "Inspect table schemas, run analytical SQL queries, and monitor active database instances.",
    category: "databases",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres", "$POSTGRES_URL"],
    sourceId: "mcpservers-org",
    author: "Model Context Protocol",
    npmPackage: "@modelcontextprotocol/server-postgres",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres",
    params: [
      {
        key: "POSTGRES_URL",
        label: "Database Connection URL",
        description: "Postgres or Neon connection URI with credentials.",
        target: "arg",
        placeholder: "postgresql://user:pass@ep-xyz.neon.tech/dbname?sslmode=require",
        defaultValue: "postgresql://localhost:5432/dbname",
      },
    ],
  },
  {
    id: "sqlite",
    name: "SQLite Explorer",
    description: "Query and inspect local SQLite database files (.db, .sqlite, .sqlite3) without leaving the terminal.",
    category: "databases",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sqlite", "--db-path", "$DB_PATH"],
    sourceId: "mcpservers-org",
    author: "Model Context Protocol",
    npmPackage: "@modelcontextprotocol/server-sqlite",
    params: [
      {
        key: "DB_PATH",
        label: "SQLite File Path",
        description: "Absolute or relative path to your SQLite database file.",
        target: "arg",
        placeholder: "./development.sqlite3",
        defaultValue: "./app.db",
      },
    ],
  },
  {
    id: "redis",
    name: "Redis Cache Manager",
    description: "Inspect cached keys, view TTLs, manage session storage, and test Redis cache invalidation.",
    category: "databases",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-redis", "$REDIS_URL"],
    sourceId: "mcpservers-org",
    author: "Model Context Protocol",
    npmPackage: "@modelcontextprotocol/server-redis",
    params: [
      {
        key: "REDIS_URL",
        label: "Redis Connection URL",
        description: "Redis server address (e.g. redis://localhost:6379).",
        target: "arg",
        placeholder: "redis://localhost:6379",
        defaultValue: "redis://localhost:6379",
      },
    ],
  },

  // DevOps & Cloud
  {
    id: "docker",
    name: "Docker / Podman",
    description: "Monitor containers, stream container logs, list active images, and control services directly.",
    category: "devops",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-docker"],
    sourceId: "anthropic-official",
    author: "Model Context Protocol",
    npmPackage: "@modelcontextprotocol/server-docker",
    homepage: "https://github.com/modelcontextprotocol/servers",
  },
  {
    id: "kubernetes",
    name: "Kubernetes Cluster Inspector",
    description: "Inspect pods, retrieve crash logs, describe deployments, and monitor cluster workloads directly.",
    category: "devops",
    command: "npx",
    args: ["-y", "kubernetes-mcp-server"],
    sourceId: "mcpservers-org",
    author: "strowk",
    npmPackage: "kubernetes-mcp-server",
    homepage: "https://github.com/strowk/kubernetes-mcp-server",
  },
  {
    id: "cloudflare",
    name: "Cloudflare Platform",
    description: "Manage Cloudflare Workers, inspect KV stores, and verify DNS configuration in real time.",
    category: "devops",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-cloudflare"],
    sourceId: "mcpservers-org",
    author: "Model Context Protocol",
    npmPackage: "@modelcontextprotocol/server-cloudflare",
    env: { CLOUDFLARE_API_TOKEN: "" },
    params: [
      {
        key: "CLOUDFLARE_API_TOKEN",
        label: "Cloudflare API Token",
        description: "Scoped token with Workers and DNS permissions.",
        target: "env",
        placeholder: "Bearer token",
      },
    ],
  },

  // Security
  {
    id: "snyk",
    name: "Snyk Security SAST",
    description: "Static security scanning, open source vulnerability auditing, and SBOM inspections.",
    category: "security",
    command: "snyk",
    args: ["mcp"],
    sourceId: "mcpservers-org",
    author: "Snyk",
    homepage: "https://snyk.io",
  },

  // Productivity & Git
  {
    id: "github",
    name: "GitHub API",
    description: "Search repos, inspect pull request diffs, view and reply to issues directly from chat.",
    category: "productivity",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    sourceId: "anthropic-official",
    author: "Model Context Protocol",
    npmPackage: "@modelcontextprotocol/server-github",
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: "" },
    params: [
      {
        key: "GITHUB_PERSONAL_ACCESS_TOKEN",
        label: "Personal Access Token",
        description: "Classic or fine-grained token with repo read/write access.",
        target: "env",
        placeholder: "ghp_...",
      },
    ],
  },
  {
    id: "gitlab",
    name: "GitLab Manager",
    description: "Integrate with GitLab issues, merge requests, pipelines, and repository files.",
    category: "productivity",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-gitlab"],
    sourceId: "mcpservers-org",
    author: "Model Context Protocol",
    npmPackage: "@modelcontextprotocol/server-gitlab",
    env: { GITLAB_PERSONAL_ACCESS_TOKEN: "" },
    params: [
      {
        key: "GITLAB_PERSONAL_ACCESS_TOKEN",
        label: "GitLab Access Token",
        description: "GitLab Personal Access Token with api scope.",
        target: "env",
        placeholder: "glpat-...",
      },
    ],
  },
  {
    id: "linear",
    name: "Linear Issues",
    description: "Read assigned tasks, view sprint backlogs, and update issue statuses during development.",
    category: "productivity",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-linear"],
    sourceId: "mcpservers-org",
    author: "Model Context Protocol",
    npmPackage: "@modelcontextprotocol/server-linear",
    env: { LINEAR_API_KEY: "" },
    params: [
      {
        key: "LINEAR_API_KEY",
        label: "Linear API Key",
        description: "Personal Linear API key from your profile settings.",
        target: "env",
        placeholder: "lin_api_...",
      },
    ],
  },
  {
    id: "sentry",
    name: "Sentry Error Monitoring",
    description: "Feed production crash reports, exception stack traces, and issue telemetry to NovaTerm AI.",
    category: "productivity",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sentry"],
    sourceId: "mcpservers-org",
    author: "Model Context Protocol",
    npmPackage: "@modelcontextprotocol/server-sentry",
    env: { SENTRY_AUTH_TOKEN: "" },
    params: [
      {
        key: "SENTRY_AUTH_TOKEN",
        label: "Sentry Auth Token",
        description: "User or internal integration token with project:read permission.",
        target: "env",
        placeholder: "sntrys_...",
      },
    ],
  },

  // Docs and Research
  {
    id: "devdocs",
    name: "DevDocs API Reference",
    description: "Official documentation and verified API definitions for TypeScript, Rust, Python, Go, and React.",
    category: "research",
    command: "npx",
    args: ["-y", "mcp-server-devdocs"],
    sourceId: "mcpservers-org",
    author: "Community",
    npmPackage: "mcp-server-devdocs",
  },
  {
    id: "memory",
    name: "Knowledge Graph Memory",
    description: "Persistent graph memory enabling the AI assistant to remember decisions across sessions.",
    category: "research",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    sourceId: "anthropic-official",
    author: "Model Context Protocol",
    npmPackage: "@modelcontextprotocol/server-memory",
  },

  // Browser and Web
  {
    id: "puppeteer",
    name: "Puppeteer Web Automation",
    description: "Headless browser automation to navigate pages, capture screenshots, and test web apps.",
    category: "browser",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-puppeteer"],
    sourceId: "mcpservers-org",
    author: "Model Context Protocol",
    npmPackage: "@modelcontextprotocol/server-puppeteer",
  },
  {
    id: "fetch",
    name: "Web Content Fetcher",
    description: "Retrieve online documentation, release notes, and web content directly into prompt context.",
    category: "browser",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-fetch"],
    sourceId: "anthropic-official",
    author: "Model Context Protocol",
    npmPackage: "@modelcontextprotocol/server-fetch",
  },
];

export function getRegistryItems(options?: {
  sourceId?: string;
  category?: McpRegistryCategory;
  search?: string;
}): McpRegistryItem[] {
  let list = CURATED_MCP_CATALOG;

  if (options?.sourceId && options.sourceId !== "all") {
    list = list.filter((item) => item.sourceId === options.sourceId);
  }

  if (options?.category && options.category !== "all") {
    list = list.filter((item) => item.category === options.category);
  }

  if (options?.search) {
    const q = options.search.trim().toLowerCase();
    list = list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.npmPackage && item.npmPackage.toLowerCase().includes(q)),
    );
  }

  return list;
}
