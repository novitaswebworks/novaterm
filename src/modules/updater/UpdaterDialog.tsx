import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { openUrl } from "@tauri-apps/plugin-opener";

import { useUpdater } from "./useUpdater";

export function UpdaterDialog() {
  const { status, dismiss } = useUpdater();

  const open = status.kind === "manual-available" || status.kind === "error";

  if (!open) return null;

  const manual = status.kind === "manual-available" ? status.info : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) dismiss();
      }}
    >
      <DialogContent className="sm:max-w-[440px] glass-panel glow-hover">
        <DialogHeader>
          <DialogTitle>
            {manual
              ? `NovaTerm v${manual.version} is available!`
              : "Update Error"}
          </DialogTitle>
          <DialogDescription>
            {manual
              ? `You are currently on v${manual.currentVersion}. Click below to view the release and download the latest installer.`
              : status.kind === "error"
                ? status.message
                : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Later
          </Button>
          {manual && (
            <Button
              size="sm"
              onClick={() => {
                void openUrl(manual.releaseUrl);
                dismiss();
              }}
            >
              Download Update
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
