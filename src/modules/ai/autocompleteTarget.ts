import type { AutocompleteProviderId } from "./config";
import { type CustomEndpoint, endpointIdFromCompatModel } from "./providers";

export type AutocompletePrefs = {
  autocompleteProvider: AutocompleteProviderId;
  autocompleteModelId: string;
  lmstudioModelId: string;
  mlxModelId: string;
  ollamaModelId: string;
  openrouterModelId: string;
  openaiCompatibleBaseURL: string;
  customEndpoints: readonly CustomEndpoint[];
};

export type AutocompleteTarget = {
  modelId: string;
  openaiCompatibleBaseURL: string;
  /** Set when the provider is a named OpenAI-compatible endpoint. */
  endpointId: string | null;
};

/** Resolves what the autocomplete provider should actually call. Named
 *  compat endpoints store a synthetic `compat-` id; the real model id, base
 *  URL and key slot come from the endpoint itself. */
export function resolveAutocompleteTarget(
  p: AutocompletePrefs,
): AutocompleteTarget {
  const provider = p.autocompleteProvider;
  const endpoint =
    provider === "openai-compatible"
      ? p.customEndpoints.find(
          (e) => e.id === endpointIdFromCompatModel(p.autocompleteModelId),
        )
      : undefined;

  const modelId =
    provider === "lmstudio"
      ? p.lmstudioModelId
      : provider === "mlx"
        ? p.mlxModelId
        : provider === "ollama"
          ? p.ollamaModelId
          : provider === "openai-compatible"
            ? (endpoint?.modelId ?? "")
            : provider === "openrouter"
              ? p.openrouterModelId
              : p.autocompleteModelId;

  return {
    modelId,
    openaiCompatibleBaseURL: endpoint?.baseURL ?? p.openaiCompatibleBaseURL,
    endpointId: endpoint?.id ?? null,
  };
}
