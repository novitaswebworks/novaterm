import { describe, expect, it } from "vitest";
import {
  formatArgs,
  normalizeServerId,
  parseEnv,
  splitArgs,
} from "./serverForm";

describe("splitArgs", () => {
  it("splits on whitespace", () => {
    expect(splitArgs("-y  pkg  --flag")).toEqual(["-y", "pkg", "--flag"]);
  });

  it("keeps quoted arguments with spaces together", () => {
    expect(splitArgs("--dir \"/my path/x\" 'a b'")).toEqual([
      "--dir",
      "/my path/x",
      "a b",
    ]);
  });

  it("keeps an explicitly empty quoted argument", () => {
    expect(splitArgs('a "" b')).toEqual(["a", "", "b"]);
  });

  it("returns nothing for blank input", () => {
    expect(splitArgs("   ")).toEqual([]);
  });
});

describe("formatArgs", () => {
  it.each([
    [["-y", "pkg"]],
    [["--dir", "/my path/x"]],
    [["a b", "", "it's"]],
    [['say "hi" now']],
  ])("round-trips through splitArgs: %j", (args) => {
    expect(splitArgs(formatArgs(args))).toEqual(args);
  });
});

describe("parseEnv", () => {
  it("returns undefined for empty input", () => {
    expect(parseEnv("  ")).toEqual({ ok: true, env: undefined });
  });

  it("coerces numbers and booleans to strings", () => {
    expect(parseEnv('{"PORT": 5432, "DEBUG": true, "A": "b"}')).toEqual({
      ok: true,
      env: { PORT: "5432", DEBUG: "true", A: "b" },
    });
  });

  it("rejects nested or null values", () => {
    expect(parseEnv('{"A": {"b": 1}}').ok).toBe(false);
    expect(parseEnv('{"A": null}').ok).toBe(false);
  });

  it("rejects malformed JSON instead of reading it as lines", () => {
    expect(parseEnv('{"A": ').ok).toBe(false);
  });

  it("parses KEY=VALUE lines", () => {
    expect(parseEnv("A=1\nB = two=2")).toEqual({
      ok: true,
      env: { A: "1", B: "two=2" },
    });
  });
});

describe("normalizeServerId", () => {
  it("lowercases and replaces unsafe characters", () => {
    expect(normalizeServerId(" My DB.1 ")).toBe("my-db-1");
  });
});
