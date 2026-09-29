import type { McpTemplate } from "./types";

export const BUILTIN_MCP_TEMPLATES: McpTemplate[] = [
  {
    id: "neon-postgres",
    name: "Neon / PostgreSQL",
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-postgres",
      "postgresql://user:password@ep-example.region.aws.neon.tech/neondb?sslmode=require",
    ],
    description:
      "Query schemas, inspect database tables, and run SQL queries against PostgreSQL or Neon databases.",
  },
  {
    id: "docker",
    name: "Docker / Podman",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-docker"],
    description:
      "Inspect containers, stream logs, list active images, and monitor Docker services directly.",
  },
  {
    id: "github",
    name: "GitHub API",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: "",
    },
    description:
      "Search repositories, list pull requests, inspect commits, and manage GitHub issues without leaving the terminal.",
  },
  {
    id: "snyk",
    name: "Snyk Security",
    command: "snyk",
    args: ["mcp"],
    description:
      "Scan application dependencies, test code for security vulnerabilities, and inspect SBOMs using Snyk CLI.",
  },
];
