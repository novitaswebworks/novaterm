import { describe, expect, it } from "vitest";
import {
  type AutocompletePrefs,
  resolveAutocompleteTarget,
} from "./autocompleteTarget";
import { compatModelIdForEndpoint } from "./providers";

const base: AutocompletePrefs = {
  autocompleteProvider: "cerebras",
  autocompleteModelId: "gpt-oss-120b",
  lmstudioModelId: "lm-model",
  mlxModelId: "mlx-model",
  ollamaModelId: "ollama-model",
  openrouterModelId: "or/model",
  openaiCompatibleBaseURL: "http://legacy/v1",
  customEndpoints: [
    {
      id: "ep1",
      name: "Mine",
      baseURL: "https://api.example.com/v1",
      modelId: "real-model",
      contextLimit: 128000,
    },
  ],
};

describe("resolveAutocompleteTarget", () => {
  it("uses the stored id for cloud providers", () => {
    expect(resolveAutocompleteTarget(base)).toEqual({
      modelId: "gpt-oss-120b",
      openaiCompatibleBaseURL: "http://legacy/v1",
      endpointId: null,
    });
  });

  it("uses the per-provider id for local providers", () => {
    expect(
      resolveAutocompleteTarget({ ...base, autocompleteProvider: "ollama" })
        .modelId,
    ).toBe("ollama-model");
  });

  it("resolves a named endpoint to its real model, URL and key slot", () => {
    expect(
      resolveAutocompleteTarget({
        ...base,
        autocompleteProvider: "openai-compatible",
        autocompleteModelId: compatModelIdForEndpoint("ep1"),
      }),
    ).toEqual({
      modelId: "real-model",
      openaiCompatibleBaseURL: "https://api.example.com/v1",
      endpointId: "ep1",
    });
  });

  it("returns an empty model when the endpoint no longer exists", () => {
    const t = resolveAutocompleteTarget({
      ...base,
      autocompleteProvider: "openai-compatible",
      autocompleteModelId: compatModelIdForEndpoint("gone"),
    });
    expect(t.modelId).toBe("");
    expect(t.endpointId).toBeNull();
  });
});
