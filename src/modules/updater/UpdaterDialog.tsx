import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

import { openUrl } from "@tauri-apps/plugin-opener";

import { useUpdater } from "./useUpdater";

export function UpdaterDialog() {
  const { status, dismiss, install, lastInfo } = useUpdater();

  const busy = status.kind === "downloading" || status.kind === "ready";
  const open =
    status.kind === "manual-available" || status.kind === "error" || busy;

  if (!open) return null;

  const available = status.kind === "manual-available" ? status.info : null;
  const info = available ?? lastInfo;

  const title = available
    ? `NovaTerm v${available.version} is available!`
    : status.kind === "downloading"
      ? "Downloading update"
      : status.kind === "ready"
        ? "Update installed"
        : "Update Error";

  const description = available
    ? `You are currently on v${available.currentVersion}. NovaTerm will download the update, install it and restart.`
    : status.kind === "downloading"
      ? "Keep NovaTerm open while the update downloads."
      : status.kind === "ready"
        ? "Restarting to use the new version."
        : status.kind === "error"
          ? status.message
          : "";

  const percent =
    status.kind === "downloading" && status.contentLength
      ? Math.min(
          100,
          Math.round((status.downloaded / status.contentLength) * 100),
        )
      : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !busy) dismiss();
      }}
    >
      <DialogContent className="sm:max-w-[440px] glass-panel glow-hover">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {status.kind === "downloading" ? (
          <Progress value={percent ?? undefined} className="h-1.5" />
        ) : null}
        <DialogFooter>
          {!busy && (
            <Button variant="ghost" size="sm" onClick={dismiss}>
              Later
            </Button>
          )}
          {info && !busy && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void openUrl(info.releaseUrl)}
            >
              Release notes
            </Button>
          )}
          {available && (
            <Button size="sm" onClick={() => void install()}>
              Update and restart
            </Button>
          )}
          {status.kind === "error" && info && (
            <Button size="sm" onClick={() => void install()}>
              Try again
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
