import { WindowControls } from "@/components/WindowControls";
import { IS_MAC, USE_CUSTOM_WINDOW_CONTROLS } from "@/lib/platform";
import type { SettingsTab } from "@/modules/settings/openSettingsWindow";
import { usePreferencesStore } from "@/modules/settings/preferences";
import {
  AiScanIcon,
  InformationCircleIcon,
  PaintBoardIcon,
  Settings01Icon,
  UserMultiple02Icon,
  KeyboardIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { type JSX, useEffect, useState } from "react";
import { AboutSection } from "./sections/AboutSection";
import { VaultSection } from "./sections/VaultSection";
import { AgentsSection } from "./sections/AgentsSection";
import { GeneralSection } from "./sections/GeneralSection";
import { ModelsSection } from "./sections/ModelsSection";
import { ShortcutsSection } from "./sections/ShortcutsSection";
import { ThemesSection } from "./sections/ThemesSection";

const TABS: {
  id: SettingsTab;
  label: string;
  icon: typeof Settings01Icon;
  component: () => JSX.Element;
}[] = [
  {
    id: "general",
    label: "General",
    icon: Settings01Icon,
    component: GeneralSection,
  },
  {
    id: "themes",
    label: "Themes",
    icon: PaintBoardIcon,
    component: ThemesSection,
  },
  {
    id: "shortcuts",
    label: "Shortcuts",
    icon: KeyboardIcon,
    component: ShortcutsSection,
  },
  { id: "models", label: "Models", icon: AiScanIcon, component: ModelsSection },
  { id: "vault", label: "Vault", icon: InformationCircleIcon, component: VaultSection },
  {
    id: "agents",
    label: "Agents",
    icon: UserMultiple02Icon,
    component: AgentsSection,
  },
  {
    id: "about",
    label: "About",
    icon: InformationCircleIcon,
    component: AboutSection,
  },
];

const VALID_TABS: SettingsTab[] = [
  "general",
  "themes",
  "shortcuts",
  "models",
  "agents",
  "about",
];

function readInitialTab(): SettingsTab {
  if (typeof window === "undefined") return "general";
  const url = new URL(window.location.href);
  const t = url.searchParams.get("tab");
  // Back-compat: legacy "ai" / "connections" → "models".
  if (t === "ai" || t === "connections") return "models";
  if (t && (VALID_TABS as string[]).includes(t)) return t as SettingsTab;
  return "general";
}

export function SettingsApp() {
  const [active, setActive] = useState<SettingsTab>(readInitialTab);
  const init = usePreferencesStore((s) => s.init);
  const ActiveSection = TABS.find((t) => t.id === active)?.component;

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const apply = (detail: string) => {
      if (detail === "ai" || detail === "connections") {
        setActive("models");
        return;
      }
      if ((VALID_TABS as string[]).includes(detail)) {
        setActive(detail as SettingsTab);
      }
    };
    const unlistenPromise = getCurrentWebviewWindow().listen<string>(
      "novaterm:settings-tab",
      (e) => apply(e.payload),
    );
    return () => {
      void unlistenPromise.then((un) => un());
    };
  }, []);

    return (
    <div className="flex h-screen flex-row overflow-hidden bg-background/30 text-foreground select-none backdrop-blur-3xl">
      <div 
        className={`w-52 shrink-0 border-r border-white/5 bg-background/20 flex flex-col backdrop-blur-2xl ${
          IS_MAC ? "pt-12" : "pt-4"
        }`}
        data-tauri-drag-region
      >
        <div className="px-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Settings</div>
        <nav className="flex-1 space-y-1 px-2" data-tauri-drag-region>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ease-out ${
                active === t.id 
                  ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <HugeiconsIcon icon={t.icon} size={16} strokeWidth={1.5} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-background/60 shadow-inner">
        <header data-tauri-drag-region className="h-12 shrink-0 flex items-center justify-between px-6 border-b border-border/40">
          <h1 className="text-sm font-semibold tracking-wide text-foreground/80">{TABS.find(t => t.id === active)?.label}</h1>
          {USE_CUSTOM_WINDOW_CONTROLS && <WindowControls closeOnly />}
        </header>

        <main className="flex-1 overflow-y-auto px-10 pt-10 pb-16 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]">
          <div className="mx-auto w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {ActiveSection && <ActiveSection />}
          </div>
        </main>
      </div>
    </div>
  );
}
