import { Checkbox } from "@/components/ui/checkbox";
import { Alert02Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { memo, type ReactNode } from "react";
import type { CheckState, SourceControlFileEntry } from "../useSourceControlPanel";

import { type RowDescriptor, checkboxValue } from "./helpers";
import { EntryRow } from "./EntryRow";

export function PanelCenter({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="text-sm font-medium">{title}</div>
      {body ? (
        <div className="max-w-64 text-[11px] leading-relaxed text-muted-foreground">
          {body}
        </div>
      ) : null}
      {action}
    </div>
  );
}

export function CleanTreeHint({ repoLabel }: { repoLabel: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 px-4 text-center">
      <div className="flex size-8 items-center justify-center rounded-full border border-border/55 text-muted-foreground">
        <HugeiconsIcon
          icon={CheckmarkCircle01Icon}
          size={16}
          strokeWidth={1.6}
        />
      </div>
      <div className="text-[12px] font-medium text-foreground">
        Working tree clean
      </div>
      <div className="text-[10.5px] leading-snug text-muted-foreground">
        on <span className="font-mono text-foreground/80">{repoLabel}</span>
      </div>
    </div>
  );
}

export type RowRendererProps = {
  row: RowDescriptor;
  focused: boolean;
  selectedPath: string | null;
  actionBusy: string | null;
  headerCheckState: CheckState;
  repoRoot: string | null;
  onFocusRow: (key: string | null) => void;
  onToggleAll: () => Promise<void> | void;
  onSelectFile: (entry: SourceControlFileEntry) => Promise<void>;
  onToggleStageFile: (entry: SourceControlFileEntry) => Promise<void>;
  onDiscardFile: (entry: SourceControlFileEntry) => void;
  onOpenFile?: (absolutePath: string) => void;
};

export const RowRenderer = memo(function RowRenderer(props: RowRendererProps) {
  const { row } = props;
  switch (row.kind) {
    case "banner-diverged":
      return <DivergedBanner />;
    case "list-header":
      return <ListHeader {...props} row={row} />;
    case "entry":
      return <EntryRow {...props} row={row} />;
  }
});

export function DivergedBanner() {
  return (
    <div className="mx-2 mt-1 flex h-7 items-center gap-1.5 rounded-md border border-border/60 bg-foreground/[0.04] px-2 text-[10.5px] leading-none text-muted-foreground">
      <HugeiconsIcon
        icon={Alert02Icon}
        size={11}
        strokeWidth={1.9}
        className="shrink-0"
      />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium text-foreground/85">
          Diverged from upstream
        </span>
        <span className="ml-1 opacity-75">— resolve in terminal</span>
      </span>
    </div>
  );
}

export function ListHeader({
  row,
  actionBusy,
  headerCheckState,
  onToggleAll,
}: RowRendererProps & {
  row: Extract<RowDescriptor, { kind: "list-header" }>;
}) {
  return (
    <div className="flex h-7 items-center gap-2 px-3">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/85">
        Changes
      </span>
      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-border/60 px-1 text-[9.5px] font-semibold tabular-nums text-muted-foreground">
        {row.count}
      </span>
      <label className="ml-auto flex shrink-0 cursor-pointer select-none items-center gap-1.5 text-[10.5px] font-medium text-muted-foreground hover:text-foreground">
        <span>All</span>
        <Checkbox
          aria-label="Stage all changes"
          checked={checkboxValue(headerCheckState)}
          disabled={actionBusy !== null}
          onCheckedChange={() => void onToggleAll()}
          className="size-3.5"
        />
      </label>
    </div>
  );
}
