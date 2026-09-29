import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  DEFAULT_REGISTRY_SOURCES,
  REGISTRY_CATEGORIES,
  getRegistryItems,
} from "@/modules/mcp/registry";
import { useMcpStore } from "@/modules/mcp/mcpStore";
import type {
  McpRegistryCategory,
  McpRegistryItem,
  McpRegistrySource,
  McpServerConfig,
} from "@/modules/mcp/types";
import {
  ApiIcon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  Download01Icon,
  Edit01Icon,
  GlobeIcon,
  PlusSignIcon,
  Refresh01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "../components/SectionHeader";

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
                onAdd={(newSrc) => setCustomSources((prev) => [...prev, newSrc])}
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

function RegistryCard({
  item,
  isInstalled,
  onInstall,
}: {
  item: McpRegistryItem;
  isInstalled: boolean;
  onInstall: (config: McpServerConfig) => Promise<void>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasParams = item.params && item.params.length > 0;

  const handleInstantInstall = async () => {
    setLoading(true);
    try {
      await onInstall({
        id: item.id,
        name: item.name,
        command: item.command,
        args: item.args,
        env: item.env,
        enabled: true,
        description: item.description,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-between rounded-lg border border-border/60 bg-card/60 p-3 hover:border-border transition-colors">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-medium text-foreground truncate">
              {item.name}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1 rounded">
                {item.npmPackage || item.command}
              </span>
              <span className="text-[9.5px] text-muted-foreground/80">
                {item.sourceId === "mcpservers-org"
                  ? "mcpservers.org"
                  : "Anthropic"}
              </span>
            </div>
          </div>

          {isInstalled ? (
            <span className="flex items-center gap-1 text-[10.5px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium shrink-0">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3" />
              Installed
            </span>
          ) : hasParams ? (
            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => setDialogOpen(true)}
              className="h-7 text-[11px] gap-1 px-2.5 shrink-0"
            >
              <HugeiconsIcon icon={Download01Icon} className="size-3.5" />
              Install
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={loading}
              onClick={handleInstantInstall}
              className="h-7 text-[11px] gap-1 px-2.5 shrink-0"
            >
              <HugeiconsIcon icon={Download01Icon} className="size-3.5" />
              1-Click Install
            </Button>
          )}
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2 mt-0.5">
          {item.description}
        </p>
      </div>

      {hasParams && (
        <InstallRegistryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          item={item}
          onConfirm={async (finalConfig) => {
            await onInstall(finalConfig);
            setDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}

function InstallRegistryDialog({
  open,
  onOpenChange,
  item,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: McpRegistryItem;
  onConfirm: (config: McpServerConfig) => Promise<void>;
}) {
  const [paramValues, setParamValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const p of item.params || []) {
      initial[p.key] = p.defaultValue || "";
    }
    return initial;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Substitute placeholders in args and env
    const resolvedArgs = item.args.map((arg) => {
      let current = arg;
      for (const [key, val] of Object.entries(paramValues)) {
        if (current === `$${key}` || current.includes(`$${key}`)) {
          current = current.replace(`$${key}`, val.trim());
        }
      }
      return current;
    });

    const resolvedEnv: Record<string, string> = { ...(item.env || {}) };
    for (const p of item.params || []) {
      if (p.target === "env") {
        resolvedEnv[p.key] = (paramValues[p.key] || "").trim();
      }
    }

    await onConfirm({
      id: item.id,
      name: item.name,
      command: item.command,
      args: resolvedArgs,
      env: resolvedEnv,
      enabled: true,
      description: item.description,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Install {item.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 py-2">
          <p className="text-[11.5px] text-muted-foreground leading-relaxed">
            {item.description}
          </p>

          <div className="flex flex-col gap-3">
            {item.params?.map((p) => (
              <div key={p.key} className="flex flex-col gap-1">
                <Label className="text-[12px] font-medium">{p.label}</Label>
                <Input
                  value={paramValues[p.key] || ""}
                  onChange={(e) =>
                    setParamValues((prev) => ({
                      ...prev,
                      [p.key]: e.target.value,
                    }))
                  }
                  placeholder={p.placeholder}
                  required
                  className="h-8 text-[12px] font-mono"
                />
                <span className="text-[10px] text-muted-foreground">
                  {p.description}
                </span>
              </div>
            ))}
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="gap-1.5">
              <HugeiconsIcon icon={Download01Icon} className="size-3.5" />
              Confirm and Install
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ServerItem({
  state,
  onToggle,
  onRestart,
  onUpdate,
  onDelete,
}: {
  state: import("@/modules/mcp/types").McpServerState;
  onToggle: (enabled: boolean) => void;
  onRestart: () => void;
  onUpdate: (
    updates: Partial<import("@/modules/mcp/types").McpServerConfig>,
  ) => Promise<void>;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = state.config;

  const statusColor = {
    connected: "bg-emerald-500",
    connecting: "bg-amber-500 animate-pulse",
    error: "bg-rose-500",
    disconnected: "bg-muted-foreground/40",
  }[state.status];

  const statusLabel = {
    connected: "Connected",
    connecting: "Connecting...",
    error: "Error",
    disconnected: "Disconnected",
  }[state.status];

  return (
    <div className="flex flex-col rounded-lg border border-border/60 bg-card/60 transition-colors">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
          >
            <HugeiconsIcon
              icon={expanded ? ArrowDown01Icon : ArrowRight01Icon}
              className="size-3.5"
            />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn("size-2 rounded-full shrink-0", statusColor)}
              title={statusLabel}
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-medium text-foreground truncate">
                  {cfg.name}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1 rounded">
                  {cfg.command} {cfg.args?.join(" ")}
                </span>
              </div>
              {state.error ? (
                <span className="text-[10.5px] text-rose-400 truncate max-w-md">
                  {state.error}
                </span>
              ) : (
                <span className="text-[10.5px] text-muted-foreground">
                  {state.tools.length}{" "}
                  {state.tools.length === 1 ? "tool" : "tools"} discovered
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <EditMcpDialog config={cfg} onSave={onUpdate} />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={onRestart}
                className="size-7 text-muted-foreground hover:text-foreground"
              >
                <HugeiconsIcon icon={Refresh01Icon} className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Restart server</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={onDelete}
                className="size-7 text-muted-foreground hover:text-rose-400"
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove server</TooltipContent>
          </Tooltip>

          <Switch
            checked={cfg.enabled}
            onCheckedChange={onToggle}
            className="scale-90"
          />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/40 px-4 py-3 bg-muted/20 flex flex-col gap-2 rounded-b-lg">
          <div className="text-[11px] font-medium text-foreground">
            Discovered Tools ({state.tools.length})
          </div>

          {state.tools.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">
              {state.status === "connected"
                ? "This server does not export any tools."
                : "Tools will appear here once the server connects successfully."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {state.tools.map((t) => (
                <div
                  key={t.name}
                  className="rounded border border-border/40 bg-background/50 p-2 flex flex-col gap-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-primary font-medium">
                      {t.name}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                      {t.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EditMcpDialog({
  config,
  onSave,
}: {
  config: import("@/modules/mcp/types").McpServerConfig;
  onSave: (
    updates: Partial<import("@/modules/mcp/types").McpServerConfig>,
  ) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(config.name);
  const [command, setCommand] = useState(config.command);
  const [argsStr, setArgsStr] = useState(config.args?.join(" ") || "");
  const [envStr, setEnvStr] = useState(
    config.env ? JSON.stringify(config.env, null, 2) : "",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let env: Record<string, string> | undefined;
    if (envStr.trim()) {
      try {
        env = JSON.parse(envStr.trim()) as Record<string, string>;
      } catch {
        env = {};
        for (const line of envStr.split("\n")) {
          const eq = line.indexOf("=");
          if (eq > 0) {
            env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
          }
        }
      }
    }
    const args = argsStr
      .trim()
      .split(/\s+/)
      .filter((s) => s.length > 0);

    await onSave({
      name: name.trim(),
      command: command.trim(),
      args,
      env,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Edit01Icon} className="size-3.5" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Edit configuration</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Server Configuration</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1">
            <Label className="text-[12px]">Display Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-8 text-[12px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[12px]">Executable Command</Label>
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              required
              className="h-8 text-[12px] font-mono"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[12px]">Arguments (space-separated)</Label>
            <Input
              value={argsStr}
              onChange={(e) => setArgsStr(e.target.value)}
              className="h-8 text-[12px] font-mono"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[12px]">Environment Variables (optional)</Label>
            <Input
              value={envStr}
              onChange={(e) => setEnvStr(e.target.value)}
              placeholder='API_KEY=xyz or {"KEY": "VAL"}'
              className="h-8 text-[12px] font-mono"
            />
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddCustomMcpDialog({
  onAdd,
}: {
  onAdd: (config: McpServerConfig) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [argsStr, setArgsStr] = useState("");
  const [envStr, setEnvStr] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !name.trim() || !command.trim()) return;

    let env: Record<string, string> | undefined;
    if (envStr.trim()) {
      try {
        env = JSON.parse(envStr.trim()) as Record<string, string>;
      } catch {
        env = {};
        for (const line of envStr.split("\n")) {
          const eq = line.indexOf("=");
          if (eq > 0) {
            env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
          }
        }
      }
    }

    const args = argsStr
      .trim()
      .split(/\s+/)
      .filter((s) => s.length > 0);

    await onAdd({
      id: id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-"),
      name: name.trim(),
      command: command.trim(),
      args,
      env,
      enabled: true,
    });

    setOpen(false);
    setId("");
    setName("");
    setCommand("");
    setArgsStr("");
    setEnvStr("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-[11.5px] gap-1 px-2.5">
          <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
          Add Custom Server
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom MCP Server</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1">
            <Label className="text-[12px]">Identifier</Label>
            <Input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="e.g. custom-db"
              required
              className="h-8 text-[12px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[12px]">Display Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production Database"
              required
              className="h-8 text-[12px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[12px]">Executable Command</Label>
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g. npx, node, python3"
              required
              className="h-8 text-[12px] font-mono"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[12px]">Arguments (space-separated)</Label>
            <Input
              value={argsStr}
              onChange={(e) => setArgsStr(e.target.value)}
              placeholder="-y @modelcontextprotocol/server-postgres ..."
              className="h-8 text-[12px] font-mono"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[12px]">Environment Variables (optional)</Label>
            <Input
              value={envStr}
              onChange={(e) => setEnvStr(e.target.value)}
              placeholder='API_KEY=xyz or {"KEY": "VAL"}'
              className="h-8 text-[12px] font-mono"
            />
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save and Connect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddCustomSourceDialog({
  onAdd,
}: {
  onAdd: (src: McpRegistrySource) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    onAdd({
      id: name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-"),
      name: name.trim(),
      description: description.trim() || "Custom registry source",
      url: url.trim(),
    });

    setOpen(false);
    setName("");
    setUrl("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground">
          <HugeiconsIcon icon={PlusSignIcon} className="size-3" />
          Add Source
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Registry Source</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1">
            <Label className="text-[12px]">Source Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Internal Team Registry"
              required
              className="h-8 text-[12px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[12px]">Registry Feed URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://registry.internal.corp/mcp.json"
              required
              className="h-8 text-[12px] font-mono"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[12px]">Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Internal servers for team services"
              className="h-8 text-[12px]"
            />
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Add Source
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
