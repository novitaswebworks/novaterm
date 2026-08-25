import { resolveFontFamily } from "@/lib/fonts";
import { fmtShortcut, MOD_KEY } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { useEffect, useRef } from "react";
import {
  clearLeafBlockSelection,
  getLeafDraft,
  leafGridSelection,
  setLeafDraft,
  setLeafInputActivity,
  setLeafInputFocus,
} from "../lib/useTerminalSession";
import {
  historyCommands,
  historyList,
  historyRecord,
  historySuggest,
} from "./lib/history";
import { getKey } from "@/modules/ai/lib/keyring";
import { requestCompletion } from "@/modules/editor/lib/autocomplete/provider";
import type { BlockMode } from "./lib/modeMachine";
import { createShellEditor, type ShellEditorHandle } from "./lib/shellEditor";

type Props = {
  /** Active leaf the bar is driving; the editor retargets to it. */
  leafId: number;
  mode: BlockMode;
  focused: boolean;
  /** Changes when the active theme changes, so the editor re-themes. */
  themeKey: string;
  onSubmit: (text: string) => void;
  onInterrupt: () => void;
  getCwd: () => string | null;
};

export default function ShellInput({
  leafId,
  mode,
  focused,
  themeKey,
  onSubmit,
  onInterrupt,
  getCwd,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<ShellEditorHandle | null>(null);
  const commandsRef = useRef<string[]>([]);
  const cbRef = useRef({ onSubmit, onInterrupt, getCwd });
  cbRef.current = { onSubmit, onInterrupt, getCwd };
  const leafIdRef = useRef(leafId);
  leafIdRef.current = leafId;
  const atPrompt = mode === "prompt";
  const focusableRef = useRef(false);
  focusableRef.current = focused && atPrompt;

  useEffect(() => {
    let alive = true;
    historyCommands("", 2000).then((cmds) => {
      if (alive) commandsRef.current = cmds;
    });
    return () => {
      alive = false;
    };
  }, []);

  const fontFamilyPref = usePreferencesStore((p) => p.terminalFontFamily);
  const fontSize = usePreferencesStore((p) => p.terminalFontSize);
  const autocompleteEnabled = usePreferencesStore((p) => p.autocompleteEnabled);
  const autocompleteProvider = usePreferencesStore(
    (p) => p.autocompleteProvider,
  );
  const autocompleteModelId = usePreferencesStore((p) => p.autocompleteModelId);
  const lmstudioBaseURL = usePreferencesStore((p) => p.lmstudioBaseURL);
  const mlxBaseURL = usePreferencesStore((p) => p.mlxBaseURL);
  const ollamaBaseURL = usePreferencesStore((p) => p.ollamaBaseURL);
  const openaiCompatibleBaseURL = usePreferencesStore(
    (p) => p.openaiCompatibleBaseURL,
  );
  const fontFamily = resolveFontFamily(fontFamilyPref);
  const fontRef = useRef({ fontFamily, fontSize });
  fontRef.current = { fontFamily, fontSize };
  const inflightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const handle = createShellEditor({
      parent: host,
      fontFamily: fontRef.current.fontFamily,
      fontSize: fontRef.current.fontSize,
      placeholderText: `Run a command  -  ↑ history  ${fmtShortcut(MOD_KEY, "U")} switch to AI`,
      commandNames: () => commandsRef.current,
      getCwd: () => cbRef.current.getCwd(),
      onChange: (text) =>
        setLeafInputActivity(leafIdRef.current, text.length > 0),
      suggest: async (line) => {
        if (!line.trim()) return null;
        const local = await historySuggest(line);
        if (local) return local;

        if (!autocompleteEnabled) return null;

        if (inflightRef.current) {
          inflightRef.current.abort();
        }
        const ac = new AbortController();
        inflightRef.current = ac;

        try {
          await new Promise((r) => setTimeout(r, 200));
          if (ac.signal.aborted) return null;

          const apiKey = await getKey(autocompleteProvider);
          const deps = {
            provider: autocompleteProvider,
            modelId: autocompleteModelId,
            lmstudioBaseURL,
            mlxBaseURL,
            ollamaBaseURL,
            openaiCompatibleBaseURL,
            apiKey,
          };

          const req = {
            prefix: line,
            suffix: "",
            filename: null,
            language: "shell",
          };

          const res = await requestCompletion(req, deps, ac.signal);
          if (ac.signal.aborted) return null;
          return res ? line + res : null;
        } catch {
          return null;
        }
      },
      historyList,
      onSubmit: (text) => {
        historyRecord(text);
        const first = text.trim().split(/\s+/)[0];
        if (first && !commandsRef.current.includes(first)) {
          commandsRef.current = [first, ...commandsRef.current];
        }
        cbRef.current.onSubmit(text);
      },
      onInterrupt: () => cbRef.current.onInterrupt(),
      onEscape: () => clearLeafBlockSelection(leafIdRef.current),
    });
    handleRef.current = handle;
    requestAnimationFrame(() => handleRef.current?.focus());
    return () => {
      handle.destroy();
      handleRef.current = null;
    };
  }, [openaiCompatibleBaseURL, mlxBaseURL, autocompleteModelId, ollamaBaseURL, lmstudioBaseURL, autocompleteProvider, autocompleteEnabled]);

  // Retarget the single editor to the active leaf: register its focus callback
  // and swap drafts so each leaf keeps its own unsent command. New or switched
  // tabs land with the cursor already in the input.
  useEffect(() => {
    setLeafInputFocus(leafId, () => handleRef.current?.focus());
    handleRef.current?.setValue(getLeafDraft(leafId));
    requestAnimationFrame(() => {
      if (focusableRef.current && leafIdRef.current === leafId) {
        handleRef.current?.focus();
      }
    });
    return () => {
      const value = handleRef.current?.getValue() ?? "";
      setLeafDraft(leafId, value);
      setLeafInputActivity(leafId, value.length > 0);
      setLeafInputFocus(leafId, null);
    };
  }, [leafId]);

  useEffect(() => {
    void themeKey;
    handleRef.current?.retheme(fontFamily, fontSize);
  }, [fontFamily, fontSize, themeKey]);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    handle.setEditable(atPrompt);
    if (atPrompt) handle.focus();
  }, [atPrompt]);

  useEffect(() => {
    if (focused && atPrompt) handleRef.current?.focus();
  }, [focused, atPrompt]);

  // The editor holds focus at the prompt, so a Cmd+C over a grid selection lands
  // here, not on the xterm. Copy the grid selection unless the editor has its own.
  const onCopyCapture = (e: React.ClipboardEvent) => {
    const view = handleRef.current?.view;
    if (view && !view.state.selection.main.empty) return;
    const sel = leafGridSelection(leafId);
    if (!sel) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", sel);
  };

  return (
    <div
      className={cn("flex items-start gap-2", !atPrompt && "opacity-45")}
      onCopyCapture={onCopyCapture}
    >
      <span
        className="select-none pt-px text-primary/80"
        style={{ fontFamily, fontSize: `${fontSize}px`, lineHeight: 1.5 }}
      >
        ❯
      </span>
      <div ref={hostRef} className="min-w-0 flex-1" />
    </div>
  );
}
