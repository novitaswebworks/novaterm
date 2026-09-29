import { Button } from "@/components/ui/button";
import { useUpdater } from "@/modules/updater";
import {
  CheckmarkCircle02Icon,
  Copy01Icon,
  Download01Icon,
  GithubIcon,
  Globe02Icon,
  Loading03Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { getName, getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { arch, platform } from "@tauri-apps/plugin-os";
import { useEffect, useState } from "react";
import { SectionHeader } from "../components/SectionHeader";

const REPO_URL = "https://github.com/novitaswebworks/novaterm";
const WEBSITE = "https://novaterm.novitasweb.works";

const PLATFORM_LABEL: Record<string, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  ios: "iOS",
  android: "Android",
  freebsd: "FreeBSD",
};

export function AboutSection() {
  const [version, setVersion] = useState("");
  const [name, setName] = useState("NovaTerm");
  const [build, setBuild] = useState("");
  const [rawPlatform, setRawPlatform] = useState("macos");
  const [copied, setCopied] = useState(false);
  const { status, check, lastChecked } = useUpdater({ autoCheck: false });
  const checking = status.kind === "checking";

  const handleCopyUpgradeCmd = () => {
    const cmd =
      rawPlatform === "macos"
        ? "brew upgrade --cask novaterm"
        : rawPlatform === "windows"
          ? "winget upgrade NovitasWebWorks.NovaTerm"
          : `${REPO_URL}/releases/latest`;
    void navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    void getVersion().then(setVersion);
    void getName().then(setName);
    try {
      const p = platform();
      setRawPlatform(p);
      const a = arch();
      const platformLabel = PLATFORM_LABEL[p] ?? p;
      setBuild(`${platformLabel} / ${a}`);
    } catch {
      setBuild("");
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="About" description="" />

      <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/60 p-5">
        <img src="/logo.png" alt="" className="size-12" draggable={false} />
        <div className="flex min-w-0 flex-col">
          <span className="text-[15px] font-semibold tracking-tight">
            {name}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Open-source AI-native terminal emulator
          </span>
          <span className="mt-1 font-mono text-[11px] text-muted-foreground">
            v{version || "2.0.0"}
          </span>
        </div>
      </div>

      {/* Reworked Software Updates Card */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {checking ? (
              <HugeiconsIcon
                icon={Loading03Icon}
                size={18}
                className="animate-spin text-primary shrink-0"
              />
            ) : status.kind === "uptodate" ? (
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={18}
                className="text-emerald-500 shrink-0"
              />
            ) : status.kind === "manual-available" ? (
              <HugeiconsIcon
                icon={Download01Icon}
                size={18}
                className="text-amber-500 shrink-0"
              />
            ) : status.kind === "error" ? (
              <span className="size-2.5 rounded-full bg-destructive shrink-0" />
            ) : (
              <HugeiconsIcon
                icon={RefreshIcon}
                size={18}
                className="text-muted-foreground shrink-0"
              />
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-medium leading-tight">
                {checking
                  ? "Checking for updates..."
                  : status.kind === "uptodate"
                    ? "NovaTerm is up to date"
                    : status.kind === "manual-available"
                      ? `NovaTerm v${status.info.version} is available`
                      : status.kind === "error"
                        ? "Update check failed"
                        : "Software Updates"}
              </span>
              <span className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                {status.kind === "manual-available"
                  ? `Current version: v${version || "2.0.0"}`
                  : lastChecked
                    ? `Last checked: ${new Date(lastChecked).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : "Automatic update checks active"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {status.kind === "manual-available" ? (
              <Button
                size="sm"
                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => void openUrl(status.info.releaseUrl)}
              >
                <HugeiconsIcon icon={Download01Icon} size={14} />
                Download v{status.info.version}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={checking}
                onClick={() => void check({ manual: true })}
              >
                <HugeiconsIcon
                  icon={RefreshIcon}
                  size={14}
                  className={checking ? "animate-spin" : ""}
                />
                {checking ? "Checking..." : status.kind === "error" ? "Retry" : "Check for updates"}
              </Button>
            )}
          </div>
        </div>

        {status.kind === "manual-available" && (
          <div className="flex flex-col gap-2 pt-2 border-t border-border/40 text-[11px]">
            <span className="text-muted-foreground">
              Upgrade via terminal:
            </span>
            <div className="flex items-center justify-between gap-2 rounded-lg bg-background/80 px-2.5 py-1.5 font-mono text-[11px] border border-border/40">
              <span className="select-all truncate text-foreground/90">
                {rawPlatform === "macos"
                  ? "brew upgrade --cask novaterm"
                  : rawPlatform === "windows"
                    ? "winget upgrade NovitasWebWorks.NovaTerm"
                    : "Download update package from GitHub"}
              </span>
              <button
                type="button"
                onClick={handleCopyUpgradeCmd}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-[10.5px] shrink-0 font-sans"
              >
                <HugeiconsIcon icon={Copy01Icon} size={11} />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {status.kind === "error" && (
          <div className="pt-2 border-t border-border/40 text-[11px] text-destructive/90">
            {status.message}
          </div>
        )}
      </div>

      <dl className="grid grid-cols-[110px_1fr] gap-y-2.5 text-[12px]">
        <dt className="text-muted-foreground">Build</dt>
        <dd className="font-mono text-[11.5px]">
          {build ? `${build} / v${version}` : `v${version}`}
        </dd>

        <dt className="text-muted-foreground">Bundle ID</dt>
        <dd className="font-mono text-[11.5px]">app.my-org.novaterm</dd>

        <dt className="text-muted-foreground">License</dt>
        <dd>Apache 2.0</dd>

        <dt className="text-muted-foreground">Source code</dt>
        <dd>
          <button
            type="button"
            onClick={() => void openUrl(REPO_URL)}
            className="inline-flex items-center gap-1.5 rounded-md text-[12px] underline-offset-2 hover:text-foreground hover:underline"
          >
            <HugeiconsIcon icon={GithubIcon} size={12} strokeWidth={1.75} />
            novitaswebworks/novaterm
          </button>
        </dd>
        <dt className="text-muted-foreground">Website</dt>
        <dd>
          <button
            type="button"
            onClick={() => void openUrl(WEBSITE)}
            className="inline-flex items-center gap-1.5 rounded-md text-[12px] underline-offset-2 hover:text-foreground hover:underline"
          >
            <HugeiconsIcon icon={Globe02Icon} size={12} strokeWidth={1.75} />
            novaterm.novitasweb.works
          </button>
        </dd>
      </dl>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void openUrl(REPO_URL)}
          className="gap-1.5"
        >
          <HugeiconsIcon icon={GithubIcon} size={12} strokeWidth={1.75} />
          View on GitHub
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void openUrl(`${REPO_URL}/issues/new`)}
        >
          Report an issue
        </Button>
      </div>
    </div>
  );
}
