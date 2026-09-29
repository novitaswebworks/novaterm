import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { IS_MAC, IS_WINDOWS } from "@/lib/platform";
import {
  LOCAL_WORKSPACE,
  deleteSshProfile,
  detectDevContainer,
  getSystemSshConfigs,
  listDockerContainers,
  saveSshProfile,
  startDevContainer,
  testSshConnection,
  useWorkspaceEnvStore,
  type DevContainerDetection,
  type DockerContainer,
  type SshConfig,
  type WorkspaceEnv,
} from "@/modules/workspace";
import {
  CloudServerIcon,
  ContainerIcon,
  Delete02Icon,
  PlusSignIcon,
  Refresh01Icon,
  ServerStack03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = {
  onSelect: (env: WorkspaceEnv) => void;
  cwd?: string | null;
};

export function WorkspaceEnvSelector({ onSelect, cwd }: Props) {
  const env = useWorkspaceEnvStore((s) => s.env);
  const distros = useWorkspaceEnvStore((s) => s.distros);
  const sshProfiles = useWorkspaceEnvStore((s) => s.sshProfiles);
  const loading = useWorkspaceEnvStore((s) => s.loading);
  const refreshDistros = useWorkspaceEnvStore((s) => s.refreshDistros);
  const refreshSshProfiles = useWorkspaceEnvStore((s) => s.refreshSshProfiles);

  const [systemSshConfigs, setSystemSshConfigs] = useState<SshConfig[]>([]);
  const [devContainerInfo, setDevContainerInfo] = useState<DevContainerDetection | null>(null);
  const [dockerContainers, setDockerContainers] = useState<DockerContainer[]>([]);

  const [isSshDialogOpen, setIsSshDialogOpen] = useState(false);
  const [isDockerDialogOpen, setIsDockerDialogOpen] = useState(false);

  // New SSH Form State
  const [sshLabel, setSshLabel] = useState("");
  const [sshHost, setSshHost] = useState("");
  const [sshUser, setSshUser] = useState("");
  const [sshPort, setSshPort] = useState("22");
  const [sshKeyPath, setSshKeyPath] = useState("");
  const [sshRemotePath, setSshRemotePath] = useState("~");
  const [sshTesting, setSshTesting] = useState(false);

  // Check devcontainer when cwd changes
  useEffect(() => {
    if (!cwd) return;
    void detectDevContainer(cwd).then(setDevContainerInfo);
  }, [cwd]);

  const handleOpenMenu = (open: boolean) => {
    if (!open) return;
    if (IS_WINDOWS && distros.length === 0 && !loading) {
      void refreshDistros();
    }
    void getSystemSshConfigs().then(setSystemSshConfigs);
    refreshSshProfiles();
    if (cwd) {
      void detectDevContainer(cwd).then(setDevContainerInfo);
    }
  };

  const handleTestSsh = async () => {
    if (!sshHost.trim()) {
      toast.error("Host is required");
      return;
    }
    setSshTesting(true);
    try {
      const portNum = parseInt(sshPort, 10) || 22;
      const res = await testSshConnection(
        sshHost.trim(),
        sshUser.trim() || undefined,
        portNum,
        sshKeyPath.trim() || undefined
      );
      toast.success(`Connected: ${res}`);
    } catch (e) {
      toast.error(`SSH test failed: ${String(e)}`);
    } finally {
      setSshTesting(false);
    }
  };

  const handleConnectSsh = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sshHost.trim()) {
      toast.error("Host is required");
      return;
    }

    const portNum = parseInt(sshPort, 10) || 22;
    const label = sshLabel.trim() || (sshUser ? `${sshUser}@${sshHost}` : sshHost);
    const id = `ssh-${Date.now()}`;
    const profile: SshConfig = {
      id,
      label,
      host: sshHost.trim(),
      user: sshUser.trim() || undefined,
      port: portNum,
      key_path: sshKeyPath.trim() || undefined,
      remote_path: sshRemotePath.trim() || "~",
    };

    saveSshProfile(profile);
    refreshSshProfiles();
    setIsSshDialogOpen(false);

    onSelect({
      kind: "ssh",
      id,
      label,
      host: profile.host,
      user: profile.user,
      port: profile.port,
      key_path: profile.key_path,
      remote_path: profile.remote_path || "~",
    });

    toast.success(`Connected to SSH workspace: ${label}`);
  };

  const handleSelectSavedSsh = (p: SshConfig) => {
    onSelect({
      kind: "ssh",
      id: p.id,
      label: p.label,
      host: p.host,
      user: p.user,
      port: p.port,
      key_path: p.key_path,
      remote_path: p.remote_path || "~",
    });
    toast.success(`Switched to SSH workspace: ${p.label}`);
  };

  const handleDeleteSavedSsh = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSshProfile(id);
    refreshSshProfiles();
    toast("SSH profile removed");
  };

  const [dockerLoading, setDockerLoading] = useState(false);

  const handleOpenDockerAttach = async () => {
    setIsDockerDialogOpen(true);
    setDockerLoading(true);
    try {
      const list = await listDockerContainers();
      setDockerContainers(list);
    } finally {
      setDockerLoading(false);
    }
  };

  const handleAttachContainer = (c: DockerContainer) => {
    setIsDockerDialogOpen(false);
    onSelect({
      kind: "devcontainer",
      container_id: c.id,
      name: c.names.replace(/^\//, ""),
      remote_path: "/workspaces",
    });
    toast.success(`Attached to container: ${c.names}`);
  };

  const handleStartDevContainer = async () => {
    if (!cwd) return;
    try {
      toast("Starting Dev Container...");
      const config = devContainerInfo?.config;
      const containerId = await startDevContainer(
        cwd,
        config?.image,
        config?.dockerfile
      );
      onSelect({
        kind: "devcontainer",
        container_id: containerId,
        name: config?.name || "Dev Container",
        remote_path: config?.workspace_folder || "/workspaces",
      });
      toast.success("Attached to Dev Container");
    } catch (e) {
      toast.error(`Dev container start failed: ${String(e)}`);
    }
  };

  let label = IS_WINDOWS ? "Windows" : IS_MAC ? "macOS" : "Local";
  if (env.kind === "wsl") {
    label = `WSL: ${env.distro}`;
  } else if (env.kind === "ssh") {
    label = `SSH: ${env.label || env.host}`;
  } else if (env.kind === "devcontainer") {
    label = `Container: ${env.name}`;
  }

  return (
    <>
      <DropdownMenu onOpenChange={handleOpenMenu}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-6 shrink-0 items-center gap-1.5 rounded-sm px-1.5 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:outline-none focus-visible:ring-0 data-[state=open]:bg-accent data-[state=open]:text-foreground"
            title="Workspace environment"
          >
            <HugeiconsIcon
              icon={
                env.kind === "ssh"
                  ? CloudServerIcon
                  : env.kind === "devcontainer"
                    ? ContainerIcon
                    : ServerStack03Icon
              }
              size={13}
              strokeWidth={1.75}
            />
            <span className="max-w-32 truncate">{label}</span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="min-w-64">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Active Workspace
          </DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => onSelect(LOCAL_WORKSPACE)}>
            <HugeiconsIcon icon={ServerStack03Icon} size={13} />
            <span>Local Machine ({IS_WINDOWS ? "Windows" : IS_MAC ? "macOS" : "Linux"})</span>
          </DropdownMenuItem>

          {/* Windows WSL distros */}
          {IS_WINDOWS && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                WSL Distros
              </DropdownMenuLabel>
              {distros.length === 0 ? (
                <DropdownMenuItem disabled>
                  {loading ? "Loading WSL..." : "No WSL distros found"}
                </DropdownMenuItem>
              ) : (
                distros.map((distro) => (
                  <DropdownMenuItem
                    key={distro.name}
                    onSelect={() => onSelect({ kind: "wsl", distro: distro.name })}
                  >
                    WSL: {distro.name}
                  </DropdownMenuItem>
                ))
              )}
            </>
          )}

          {/* Dev Containers */}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Dev Containers
          </DropdownMenuLabel>
          {devContainerInfo?.detected && (
            <DropdownMenuItem onSelect={() => void handleStartDevContainer()}>
              <HugeiconsIcon icon={ContainerIcon} size={13} />
              <span>
                {devContainerInfo.config?.name
                  ? `Reopen in ${devContainerInfo.config.name}`
                  : "Reopen in Dev Container"}
              </span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => void handleOpenDockerAttach()}>
            <HugeiconsIcon icon={ContainerIcon} size={13} />
            <span>Attach to Running Container...</span>
          </DropdownMenuItem>

          {/* SSH Workspaces */}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            SSH Workspaces
          </DropdownMenuLabel>
          {sshProfiles.map((p) => (
            <DropdownMenuItem
              key={p.id}
              className="flex items-center justify-between"
              onSelect={() => handleSelectSavedSsh(p)}
            >
              <div className="flex items-center gap-1.5 truncate">
                <HugeiconsIcon icon={CloudServerIcon} size={13} />
                <span className="truncate">{p.label}</span>
              </div>
              <button
                type="button"
                className="opacity-60 hover:opacity-100"
                onClick={(e) => handleDeleteSavedSsh(p.id, e)}
                title="Remove saved host"
              >
                <HugeiconsIcon icon={Delete02Icon} size={12} />
              </button>
            </DropdownMenuItem>
          ))}

          {/* System SSH Config Hosts */}
          {systemSshConfigs
            .filter((c) => !sshProfiles.some((sp) => sp.host === c.host))
            .slice(0, 5)
            .map((c) => (
              <DropdownMenuItem
                key={c.id}
                onSelect={() =>
                  handleSelectSavedSsh({
                    ...c,
                    remote_path: "~",
                  })
                }
              >
                <HugeiconsIcon icon={CloudServerIcon} size={13} />
                <span className="truncate">~/.ssh: {c.label}</span>
              </DropdownMenuItem>
            ))}

          <DropdownMenuItem onSelect={() => setIsSshDialogOpen(true)}>
            <HugeiconsIcon icon={PlusSignIcon} size={13} />
            <span>Connect to New SSH Host...</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              if (IS_WINDOWS) void refreshDistros();
              refreshSshProfiles();
            }}
          >
            <HugeiconsIcon icon={Refresh01Icon} size={13} />
            <span>Refresh Environments</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* New SSH Connection Dialog */}
      <Dialog open={isSshDialogOpen} onOpenChange={setIsSshDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Connect to Remote SSH Workspace
            </DialogTitle>
            <DialogDescription className="text-xs">
              Seamless terminal sessions and remote file tree over SSH.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConnectSsh} className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Host or IP Address
              </label>
              <Input
                placeholder="e.g. 192.168.1.100 or myserver.com"
                value={sshHost}
                onChange={(e) => setSshHost(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Username
                </label>
                <Input
                  placeholder="e.g. ubuntu"
                  value={sshUser}
                  onChange={(e) => setSshUser(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Port
                </label>
                <Input
                  placeholder="22"
                  value={sshPort}
                  onChange={(e) => setSshPort(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Private Key Path (optional)
              </label>
              <Input
                placeholder="e.g. ~/.ssh/id_ed25519"
                value={sshKeyPath}
                onChange={(e) => setSshKeyPath(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Remote Directory
                </label>
                <Input
                  placeholder="~ or /var/www"
                  value={sshRemotePath}
                  onChange={(e) => setSshRemotePath(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Display Label (optional)
                </label>
                <Input
                  placeholder="e.g. Prod Server"
                  value={sshLabel}
                  onChange={(e) => setSshLabel(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleTestSsh()}
                disabled={sshTesting}
                className="text-xs"
              >
                {sshTesting ? "Testing..." : "Test Connection"}
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Connect
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attach to Docker Container Dialog */}
      <Dialog open={isDockerDialogOpen} onOpenChange={setIsDockerDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <div>
                <DialogTitle className="text-sm font-semibold">
                  Attach to Docker Container
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Select a running Docker container to attach terminal and workspace.
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={dockerLoading}
                onClick={async () => {
                  setDockerLoading(true);
                  try {
                    const list = await listDockerContainers();
                    setDockerContainers(list);
                  } finally {
                    setDockerLoading(false);
                  }
                }}
                title="Refresh containers"
              >
                <HugeiconsIcon
                  icon={Refresh01Icon}
                  size={13}
                  className={dockerLoading ? "animate-spin" : ""}
                />
              </Button>
            </div>
          </DialogHeader>

          <div className="max-h-72 overflow-y-auto py-2 space-y-1.5">
            {dockerLoading ? (
              <div className="rounded-md border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
                Scanning running Docker containers...
              </div>
            ) : dockerContainers.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
                No running Docker containers found. Ensure Docker daemon is running.
              </div>
            ) : (
              dockerContainers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleAttachContainer(c)}
                  className="flex cursor-pointer items-center justify-between rounded-md border border-border/60 bg-card/60 p-2.5 transition-colors hover:bg-accent"
                >
                  <div>
                    <div className="font-semibold text-xs text-foreground">
                      {c.names.replace(/^\//, "")}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {c.image}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      {c.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
