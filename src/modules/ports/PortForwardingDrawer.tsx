import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Copy01Icon,
  Globe02Icon,
  LinkSquare02Icon,
  PlusSignIcon,
  Refresh01Icon,
  StopIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePortsStore } from "./portsStore";

type Props = {
  onOpenPreview: (url: string) => void;
};

export function PortForwardingDrawer({ onOpenPreview }: Props) {
  const isOpen = usePortsStore((s) => s.isOpen);
  const setOpen = usePortsStore((s) => s.setOpen);
  const ports = usePortsStore((s) => s.ports);
  const tunnels = usePortsStore((s) => s.tunnels);
  const loading = usePortsStore((s) => s.loading);
  const fetchPorts = usePortsStore((s) => s.fetchPorts);
  const startForward = usePortsStore((s) => s.startForward);
  const stopForward = usePortsStore((s) => s.stopForward);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [forwardHost, setForwardHost] = useState("");
  const [forwardRemotePort, setForwardRemotePort] = useState("");
  const [forwardLocalPort, setForwardLocalPort] = useState("");
  const [forwardUser, setForwardUser] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(() => {
      void fetchPorts();
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, fetchPorts]);

  const handleCopy = (url: string) => {
    void navigator.clipboard.writeText(url);
    toast("Copied URL to clipboard");
  };

  const handleAddForward = async (e: React.FormEvent) => {
    e.preventDefault();
    const rPort = parseInt(forwardRemotePort, 10);
    const lPort = parseInt(forwardLocalPort || forwardRemotePort, 10);
    if (!forwardHost || isNaN(rPort) || isNaN(lPort)) {
      toast.error("Please enter a valid host and port");
      return;
    }

    setSubmitting(true);
    try {
      await startForward(
        rPort,
        lPort,
        forwardHost.trim(),
        forwardUser.trim() || undefined
      );
      toast.success(`Forwarding port ${rPort} to local port ${lPort}`);
      setShowAddForm(false);
      setForwardRemotePort("");
      setForwardLocalPort("");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-xl md:max-w-2xl"
      >
        <SheetHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-base font-semibold">
                Port Forwarding & Dev Servers
              </SheetTitle>
              <SheetDescription className="text-xs">
                Active listening ports on local machine, SSH sessions, and Dev
                Containers.
              </SheetDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant={autoRefresh ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                Auto {autoRefresh ? "On" : "Off"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => void fetchPorts()}
                disabled={loading}
              >
                <HugeiconsIcon
                  icon={Refresh01Icon}
                  size={13}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-5">
          {/* Active Tunnels */}
          {tunnels.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active SSH Tunnels ({tunnels.length})
              </h3>
              <div className="space-y-1.5">
                {tunnels.map((tunnel) => {
                  const localUrl = `http://localhost:${tunnel.local_port}`;
                  return (
                    <div
                      key={tunnel.id}
                      className="flex items-center justify-between rounded-md border border-border/70 bg-card/60 p-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono font-semibold text-primary">
                          {tunnel.local_port}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-mono text-muted-foreground">
                          {tunnel.host}:{tunnel.remote_port}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setOpen(false);
                            onOpenPreview(localUrl);
                          }}
                        >
                          Preview
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => void openUrl(localUrl)}
                        >
                          Browser
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => void stopForward(tunnel.id)}
                        >
                          <HugeiconsIcon icon={StopIcon} size={12} />
                          Stop
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Listening Ports */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Listening Ports ({ports.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-xs"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <HugeiconsIcon icon={PlusSignIcon} size={12} />
                {showAddForm ? "Cancel" : "Forward Custom Port"}
              </Button>
            </div>

            {/* Manual Forward Form */}
            {showAddForm && (
              <form
                onSubmit={handleAddForward}
                className="rounded-md border border-border/80 bg-accent/40 p-3 space-y-3"
              >
                <div className="text-xs font-medium">Forward Remote Port via SSH</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Remote Host</label>
                    <Input
                      placeholder="e.g. 192.168.1.100"
                      value={forwardHost}
                      onChange={(e) => setForwardHost(e.target.value)}
                      className="h-7 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">User (optional)</label>
                    <Input
                      placeholder="e.g. ubuntu"
                      value={forwardUser}
                      onChange={(e) => setForwardUser(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Remote Port</label>
                    <Input
                      placeholder="e.g. 3000"
                      value={forwardRemotePort}
                      onChange={(e) => setForwardRemotePort(e.target.value)}
                      className="h-7 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Local Port</label>
                    <Input
                      placeholder="Same as remote"
                      value={forwardLocalPort}
                      onChange={(e) => setForwardLocalPort(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
                <Button type="submit" size="sm" className="h-7 text-xs" disabled={submitting}>
                  {submitting ? "Forwarding..." : "Start Forward"}
                </Button>
              </form>
            )}

            {ports.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
                No active listening ports detected. Start a local dev server (e.g. Vite, Next.js, cargo run) to see it here.
              </div>
            ) : (
              <div className="space-y-1.5">
                {ports.map((p) => {
                  const url = `http://localhost:${p.port}`;
                  const isRemote = p.source.startsWith("ssh:");

                  return (
                    <div
                      key={`${p.source}-${p.port}`}
                      className="flex items-center justify-between rounded-md border border-border/60 bg-card/60 p-2.5 transition-colors hover:bg-accent/40"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 min-w-12 items-center justify-center rounded bg-primary/10 px-1.5 font-mono text-xs font-semibold text-primary">
                          {p.port}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-xs text-foreground">
                              {p.process}
                            </span>
                            <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground">
                              {p.source}
                            </span>
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {p.ip}:{p.port}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => {
                            setOpen(false);
                            onOpenPreview(url);
                          }}
                          title="Open inside NovaTerm Preview Pane"
                        >
                          <HugeiconsIcon icon={Globe02Icon} size={12} />
                          Preview
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => void openUrl(url)}
                          title="Open in system browser"
                        >
                          <HugeiconsIcon icon={LinkSquare02Icon} size={12} />
                          Browser
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopy(url)}
                          title="Copy URL"
                        >
                          <HugeiconsIcon icon={Copy01Icon} size={12} />
                        </Button>
                        {isRemote && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              const host = p.source.replace("ssh:", "");
                              void startForward(p.port, p.port, host);
                            }}
                          >
                            Forward
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
