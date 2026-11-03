import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  MODELS,
  PROVIDERS,
  compatModelIdForEndpoint,
  getAutocompleteEligibleModels,
  getCompatModelInfo,
  getModel,
  getProvider,
  isCompatModelId,
  providerNeedsKey,
  type CustomEndpoint,
  type ModelId,
  type ProviderId,
} from "@/modules/ai/config";
import { usePreferencesStore } from "@/modules/settings/preferences";
import {
  setAutocompleteEnabled,
  setAutocompleteModelId,
  setAutocompleteProvider,
  setDefaultModel,
} from "@/modules/settings/store";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo } from "react";
import { ProviderIcon } from "../../components/ProviderIcon";
import { type KeysMap, isLocalProvider, FieldRow, Label } from "./shared";

export function DefaultsBlock({
  defaultModel,
  configuredIds,
  keys,
  customEndpoints,
}: {
  defaultModel: ModelId;
  configuredIds: Set<ProviderId>;
  keys: KeysMap;
  customEndpoints: readonly CustomEndpoint[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <Label>Defaults</Label>
      <div className="flex flex-col gap-2.5 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5">
        <FieldRow label="Chat model">
          <DefaultModelPicker
            defaultModel={defaultModel}
            configuredIds={configuredIds}
          />
        </FieldRow>
        <AutocompleteRow
          keys={keys}
          configuredIds={configuredIds}
          customEndpoints={customEndpoints}
        />
      </div>
    </div>
  );
}

export function DefaultModelPicker({
  defaultModel,
  configuredIds,
}: {
  defaultModel: ModelId;
  configuredIds: Set<ProviderId>;
}) {
  const m = getModel(defaultModel);
  const hasAny = configuredIds.size > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={!hasAny}
          className="h-8 flex-1 justify-between gap-2 px-2.5 text-[11.5px]"
        >
          <span className="flex items-center gap-2 truncate">
            <ProviderIcon provider={m.provider} size={13} />
            <span className="truncate">{m.label}</span>
            <span className="text-muted-foreground">· {m.hint}</span>
          </span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={11}
            strokeWidth={2}
            className="opacity-70"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
        className="min-w-70 p-1"
      >
        <div className="max-h-72 overflow-y-auto overscroll-contain pr-1">
          {PROVIDERS.filter((p) => configuredIds.has(p.id)).map((p) => {
            const models = MODELS.filter((x) => x.provider === p.id);
            if (models.length === 0) return null;
            return (
              <div key={p.id} className="px-1 pt-1.5 first:pt-1">
                <div className="mb-0.5 flex items-center gap-1.5 px-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  <ProviderIcon provider={p.id} size={11} />
                  <span>{p.label}</span>
                </div>
                {models.map((mod) => (
                  <DropdownMenuItem
                    key={mod.id}
                    onSelect={() => void setDefaultModel(mod.id as ModelId)}
                    className={cn(
                      "flex items-start gap-2 text-[12px]",
                      mod.id === defaultModel && "bg-accent/50",
                    )}
                  >
                    <span className="flex flex-1 flex-col">
                      <span>{mod.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {mod.description}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AutocompleteRow({
  keys,
  configuredIds,
  customEndpoints,
}: {
  keys: KeysMap;
  configuredIds: Set<ProviderId>;
  customEndpoints: readonly CustomEndpoint[];
}) {
  const enabled = usePreferencesStore((s) => s.autocompleteEnabled);
  const provider = usePreferencesStore((s) => s.autocompleteProvider);
  const modelId = usePreferencesStore((s) => s.autocompleteModelId);
  const eligible = useMemo(() => getAutocompleteEligibleModels(), []);

  // One selectable model per fully-configured OpenAI-compatible endpoint.
  const compatItems = useMemo(
    () =>
      customEndpoints
        .filter((e) => e.baseURL.trim() && e.modelId.trim())
        .map((e) =>
          getCompatModelInfo(compatModelIdForEndpoint(e.id), customEndpoints),
        ),
    [customEndpoints],
  );

  // Fast cloud tiers + configured local providers + named compat endpoints.
  const items = useMemo(() => {
    const local = PROVIDERS.filter(
      (p) =>
        isLocalProvider(p.id) &&
        p.id !== "openai-compatible" &&
        configuredIds.has(p.id),
    ).flatMap((p) => {
      const m = MODELS.find((x) => x.provider === p.id);
      return m ? [m] : [];
    });
    return [...eligible, ...local, ...compatItems];
  }, [eligible, configuredIds, compatItems]);

  const currentModel = useMemo(() => {
    if (provider === "openai-compatible" && isCompatModelId(modelId)) {
      return getCompatModelInfo(modelId, customEndpoints);
    }
    if (isLocalProvider(provider)) {
      return MODELS.find((m) => m.provider === provider) ?? eligible[0];
    }
    return (
      MODELS.find((m) => m.provider === provider && m.id === modelId) ??
      MODELS.find((m) => m.id === modelId) ??
      eligible[0]
    );
  }, [eligible, provider, modelId, customEndpoints]);

  const setModel = (id: string, providerId: ProviderId) => {
    void setAutocompleteProvider(providerId);
    // Compat endpoints store their compat- id; other locals use their own field.
    const keep =
      providerId === "openai-compatible" || !isLocalProvider(providerId);
    void setAutocompleteModelId(keep ? id : "");
  };

  const grouped = useMemo(() => {
    const map = new Map<ProviderId, (typeof items)[number][]>();
    for (const m of items) {
      const arr = map.get(m.provider) ?? [];
      arr.push(m);
      map.set(m.provider, arr);
    }
    return map;
  }, [items]);

  const hasKey = providerNeedsKey(provider) ? !!keys[provider] : true;

  return (
    <>
      <FieldRow label="Autocomplete">
        <div className="flex flex-1 items-center gap-2">
          <Switch
            checked={enabled}
            onCheckedChange={(v) => void setAutocompleteEnabled(v)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={!enabled}
                className="h-8 flex-1 justify-between gap-2 px-2.5 text-[11.5px]"
              >
                <span className="flex items-center gap-2 truncate">
                  <ProviderIcon provider={currentModel.provider} size={12} />
                  <span className="truncate">{currentModel.label}</span>
                  <span className="text-muted-foreground">
                    · {currentModel.hint}
                  </span>
                </span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={11}
                  strokeWidth={2}
                  className="opacity-70"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              collisionPadding={12}
              className="max-h-72 min-w-70 overflow-y-auto"
            >
              {PROVIDERS.map((p) => {
                const list = grouped.get(p.id);
                if (!list || list.length === 0) return null;
                const pConfigured =
                  p.id === "openai-compatible" || configuredIds.has(p.id);
                return (
                  <div key={p.id} className="px-1 pt-1.5 first:pt-1">
                    <div className="mb-0.5 flex items-center gap-1.5 px-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      <ProviderIcon provider={p.id} size={11} />
                      <span>{p.label}</span>
                      {!pConfigured ? (
                        <span className="ml-auto text-[9.5px] normal-case tracking-normal text-muted-foreground/70">
                          not connected
                        </span>
                      ) : null}
                    </div>
                    {list.map((m) => (
                      <DropdownMenuItem
                        key={m.id}
                        disabled={!pConfigured}
                        onSelect={() => pConfigured && setModel(m.id, p.id)}
                        className={cn(
                          "text-[11.5px]",
                          m.id === modelId && "bg-accent/50",
                        )}
                      >
                        <span className="flex flex-col">
                          <span>{m.label}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {m.description}
                          </span>
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </FieldRow>
      {enabled && !hasKey ? (
        <p className="pl-19 text-[10.5px] text-muted-foreground">
          {getProvider(provider).label} isn't connected — add it below.
        </p>
      ) : null}
    </>
  );
}
