import { describe, expect, it } from "vitest";
import {
  DEFAULT_REGISTRY_SOURCES,
  REGISTRY_CATEGORIES,
  getRegistryItems,
} from "./registry";

describe("Mcp Registry", () => {
  it("provides default sources including mcpservers.org and Anthropic", () => {
    expect(DEFAULT_REGISTRY_SOURCES.some((s) => s.id === "mcpservers-org")).toBe(true);
    expect(DEFAULT_REGISTRY_SOURCES.some((s) => s.id === "anthropic-official")).toBe(true);
  });

  it("lists all categories", () => {
    expect(REGISTRY_CATEGORIES.length).toBeGreaterThan(5);
    expect(REGISTRY_CATEGORIES.map((c) => c.id)).toContain("databases");
    expect(REGISTRY_CATEGORIES.map((c) => c.id)).toContain("devops");
  });

  it("filters registry items by search query", () => {
    const postgresItems = getRegistryItems({ search: "postgres" });
    expect(postgresItems.length).toBeGreaterThan(0);
    expect(postgresItems[0].name.toLowerCase()).toContain("postgres");
  });

  it("filters registry items by category", () => {
    const devopsItems = getRegistryItems({ category: "devops" });
    expect(devopsItems.length).toBeGreaterThan(0);
    for (const item of devopsItems) {
      expect(item.category).toBe("devops");
    }
  });

  it("filters registry items by source", () => {
    const officialItems = getRegistryItems({ sourceId: "anthropic-official" });
    expect(officialItems.length).toBeGreaterThan(0);
    for (const item of officialItems) {
      expect(item.sourceId).toBe("anthropic-official");
    }
  });
});
