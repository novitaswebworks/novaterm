import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { McpRegistryItem, McpServerConfig } from "@/modules/mcp/types";
import {
  CheckmarkCircle02Icon,
  Download01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

export function RegistryCard({
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

export function InstallRegistryDialog({
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
