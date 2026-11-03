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
import type { McpRegistrySource, McpServerConfig } from "@/modules/mcp/types";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

export function AddCustomMcpDialog({
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
      id: id
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "-"),
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
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[11.5px] gap-1 px-2.5"
        >
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
              Save and Connect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddCustomSourceDialog({
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
      id: name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "-"),
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
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
        >
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
