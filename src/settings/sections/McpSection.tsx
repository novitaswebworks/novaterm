import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  DEFAULT_REGISTRY_SOURCES,
  REGISTRY_CATEGORIES,
  getRegistryItems,
} from "@/modules/mcp/registry";
import { useMcpStore } from "@/modules/mcp/mcpStore";
import type {
  McpRegistryCategory,
  McpRegistrySource,
} from "@/modules/mcp/types";
import {
  ApiIcon,
  Download01Icon,
  GlobeIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "../components/SectionHeader";
import { RegistryCard } from "./mcp/RegistryInstall";
import { ServerItem } from "./mcp/ServerItem";
import {
  AddCustomMcpDialog,
  AddCustomSourceDialog,
} from "./mcp/AddCustomDialogs";

export function McpSection() {
  const init = useMcpStore((s) => s.init);
  const servers = useMcpStore((s) => s.servers);
  const addServer = useMcpStore((s) => s.addServer);
  const removeServer = useMcpStore((s) => s.removeServer);
  const toggleServer = useMcpStore((s) => s.toggleServer);
  const restartServer = useMcpStore((s) => s.restartServer);
  const updateServer = useMcpStore((s) => s.updateServer);

  const [activeTab, setActiveTab] = useState<"installed" | "explore">(
    "installed",
  );
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] =
    useState<McpRegistryCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customSources, setCustomSources] = useState<McpRegistrySource[]>([]);

  useEffect(() => {
    void init();
  }, [init]);

  const allSources = useMemo(
    () => [...DEFAULT_REGISTRY_SOURCES, ...customSources],
    [customSources],
  );

  const serverList = Object.values(servers);

  const filteredRegistry = useMemo(() => {
    return getRegistryItems({
      sourceId: selectedSource,
      category: selectedCategory,
      search: searchQuery,
    });
  }, [selectedSource, selectedCategory, searchQuery]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <SectionHeader
            title="Model Context Protocol (MCP)"
            description="Extend NovaTerm with local and remote MCP servers. Discovered tools are dynamically made available to the AI assistant during chats and diagnostics."
          />

          <div className="flex items-center gap-1.5 border-b border-border/60 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("installed")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
                activeTab === "installed"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              <HugeiconsIcon icon={ApiIcon} className="size-3.5" />
              <span>Configured Servers</span>
              <span className="text-[10px] bg-muted/80 px-1.5 py-0.2 rounded-full font-mono">
                {serverList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("explore")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
                activeTab === "explore"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              <HugeiconsIcon icon={GlobeIcon} className="size-3.5" />
              <span>Explore MCP Registry</span>
              <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.2 rounded-full font-medium">
                mcpservers.org
              </span>
            </button>
          </div>
        </div>

        {activeTab === "installed" ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-semibold text-foreground">
                  Active Servers
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Tools exported by these servers are automatically available in
                  terminal AI chat.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setActiveTab("explore")}
                  className="h-7 text-[11.5px] gap-1 px-2.5"
                >
                  <HugeiconsIcon icon={Download01Icon} className="size-3.5" />
                  Explore Catalog
                </Button>
                <AddCustomMcpDialog onAdd={addServer} />
              </div>
            </div>

            {serverList.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 py-10 px-4 text-center">
                <HugeiconsIcon
                  icon={ApiIcon}
                  className="size-9 text-muted-foreground/60 mb-2"
                />
                <p className="text-[13px] font-medium text-foreground">
                  No MCP servers configured
                </p>
                <p className="text-[11px] text-muted-foreground max-w-sm mt-0.5">
                  Browse the MCP registry to install community connectors with
                  one click, or add a custom stdio command.
                </p>
                <Button
                  size="sm"
                  onClick={() => setActiveTab("explore")}
                  className="mt-3.5 h-7 text-[11px] gap-1.5"
                >
                  <HugeiconsIcon icon={GlobeIcon} className="size-3.5" />
                  Explore Registry
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {serverList.map((srv) => (
                  <ServerItem
                    key={srv.config.id}
                    state={srv}
                    onToggle={(enabled) => toggleServer(srv.config.id, enabled)}
                    onRestart={() => restartServer(srv.config.id)}
                    onUpdate={async (updates) => {
                      await updateServer(srv.config.id, updates);
                      if (srv.config.enabled) {
                        await restartServer(srv.config.id);
                      }
                    }}
                    onDelete={() => removeServer(srv.config.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card/60 border border-border/60 p-3 rounded-lg">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                <div className="flex items-center gap-2 min-w-[200px]">
                  <Label className="text-[11px] text-muted-foreground whitespace-nowrap">
                    Registry Source:
                  </Label>
                  <Select
                    value={selectedSource}
                    onValueChange={setSelectedSource}
                  >
                    <SelectTrigger className="h-7 text-[11px] min-w-[160px]">
                      <SelectValue placeholder="Select Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      {allSources.map((src) => (
                        <SelectItem key={src.id} value={src.id}>
                          {src.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative flex-1">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
                  />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search MCP servers by name, description, package..."
                    className="h-7 text-[11.5px] pl-8 pr-3"
                  />
                </div>
              </div>

              <AddCustomSourceDialog
                onAdd={(newSrc) =>
                  setCustomSources((prev) => [...prev, newSrc])
                }
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {REGISTRY_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-colors",
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredRegistry.map((item) => {
                const isInstalled = Boolean(servers[item.id]);
                return (
                  <RegistryCard
                    key={item.id}
                    item={item}
                    isInstalled={isInstalled}
                    onInstall={async (config) => {
                      await addServer(config);
                    }}
                  />
                );
              })}
            </div>

            {filteredRegistry.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="size-8 opacity-40 mb-2"
                />
                <p className="text-[12.5px] font-medium text-foreground">
                  No MCP servers found
                </p>
                <p className="text-[11px] max-w-sm mt-0.5">
                  Try adjusting your search query, switching categories, or
                  selecting All Sources.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
