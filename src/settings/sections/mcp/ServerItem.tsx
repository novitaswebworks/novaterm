import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { EditMcpDialog } from "./EditMcpDialog";

export function ServerItem({
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
