import { type RefObject, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Tab } from "@/modules/tabs";
import {
  appUpdatedOnDisk,
  relaunchApp,
  UPDATE_INSTALLED_EVENT,
} from "@/modules/updater/restart";
import { anyTerminalBusy } from "./useAppCloseGuard";

const POLL_MS = 30_000;
const BUSY_RECHECK_MS = 15_000;
const RESTART_DELAY_MS = 5_000;
const TOAST_ID = "app-update-restart";

/** Restarts into a newly installed build, whether the update came from the
 *  in-app updater or from outside (brew, winget, a package upgrade). Restarting
 *  closes every shell, so it only happens on its own while nothing is running;
 *  otherwise the user gets a prompt. */
export function useRestartOnUpdate(tabsRef: RefObject<Tab[]>) {
  const handling = useRef(false);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let countdown: ReturnType<typeof setTimeout> | undefined;

    const restart = () => {
      toast.dismiss(TOAST_ID);
      void relaunchApp().catch((err) => {
        handling.current = false;
        toast.error("Could not restart NovaTerm", {
          id: TOAST_ID,
          description: String(err),
        });
      });
    };

    const promptWhileBusy = () => {
      toast("NovaTerm was updated", {
        id: TOAST_ID,
        description:
          "Restart to use the new version. Running commands will be stopped.",
        duration: Number.POSITIVE_INFINITY,
        action: { label: "Restart now", onClick: restart },
      });
      timer = setTimeout(() => void evaluate(), BUSY_RECHECK_MS);
    };

    const evaluate = async () => {
      if (disposed) return;
      if (await anyTerminalBusy(tabsRef.current)) {
        promptWhileBusy();
        return;
      }
      toast("NovaTerm was updated", {
        id: TOAST_ID,
        description: "Restarting in a few seconds to use the new version.",
        duration: RESTART_DELAY_MS,
        action: {
          label: "Later",
          onClick: () => {
            if (countdown) clearTimeout(countdown);
            promptWhileBusy();
          },
        },
      });
      countdown = setTimeout(async () => {
        if (disposed) return;
        if (await anyTerminalBusy(tabsRef.current)) promptWhileBusy();
        else restart();
      }, RESTART_DELAY_MS);
    };

    const onUpdated = () => {
      if (handling.current) return;
      handling.current = true;
      void evaluate();
    };

    const poll = async () => {
      if (disposed || handling.current) return;
      try {
        if (await appUpdatedOnDisk()) onUpdated();
      } catch {
        /* not running inside Tauri */
      }
    };

    const interval = setInterval(() => void poll(), POLL_MS);
    const onFocus = () => void poll();
    window.addEventListener("focus", onFocus);
    window.addEventListener(UPDATE_INSTALLED_EVENT, onUpdated);

    return () => {
      disposed = true;
      clearInterval(interval);
      if (timer) clearTimeout(timer);
      if (countdown) clearTimeout(countdown);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(UPDATE_INSTALLED_EVENT, onUpdated);
    };
  }, [tabsRef]);
}
