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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

export function EditMcpDialog({
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
            <Label className="text-[12px]">
              Environment Variables (optional)
            </Label>
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
