import { describe, expect, it } from "vitest";
import {
  formatArgs,
  normalizeServerId,
  parseEnv,
  parseArgs,
} from "./serverForm";

describe("parseArgs", () => {
  it("splits on whitespace", () => {
    expect(parseArgs("-y  pkg  --flag")).toEqual({
      ok: true,
      args: ["-y", "pkg", "--flag"],
    });
  });

  it("keeps quoted arguments with spaces together", () => {
    expect(parseArgs("--dir \"/my path/x\" 'a b'")).toEqual({
      ok: true,
      args: ["--dir", "/my path/x", "a b"],
    });
  });

  it("keeps an explicitly empty quoted argument", () => {
    expect(parseArgs('a "" b')).toEqual({ ok: true, args: ["a", "", "b"] });
  });

  it("rejects an unclosed quote instead of guessing", () => {
    expect(parseArgs('--name "my value').ok).toBe(false);
    expect(parseArgs("it's").ok).toBe(false);
  });

  it("returns nothing for blank input", () => {
    expect(parseArgs("   ")).toEqual({ ok: true, args: [] });
  });
});

describe("formatArgs", () => {
  it.each([
    [["-y", "pkg"]],
    [["--dir", "/my path/x"]],
    [["a b", "", "it's"]],
    [['say "hi" now']],
  ])("round-trips through parseArgs: %j", (args) => {
    expect(parseArgs(formatArgs(args))).toEqual({ ok: true, args });
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

  it("rejects JSON arrays so saving cannot silently erase variables", () => {
    expect(parseEnv("[]").ok).toBe(false);
    expect(parseEnv('[{"A":"b"}]').ok).toBe(false);
  });

  it("rejects lines that are not KEY=VALUE", () => {
    expect(parseEnv("A=1\noops").ok).toBe(false);
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
