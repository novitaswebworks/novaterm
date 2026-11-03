export function splitArgs(input: string): string[] {
  const args: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  let started = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === "\\" && quote === '"' && input[i + 1] === '"') {
        cur += '"';
        i++;
      } else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
    } else if (/\s/.test(ch)) {
      if (started || cur) args.push(cur);
      cur = "";
      started = false;
    } else {
      cur += ch;
      started = true;
    }
  }
  if (started || cur) args.push(cur);
  return args;
}

export function formatArgs(args: readonly string[]): string {
  return args
    .map((a) => {
      if (a !== "" && !/[\s"']/.test(a)) return a;
      if (!a.includes('"')) return `"${a}"`;
      if (!a.includes("'")) return `'${a}'`;
      return `"${a.replace(/"/g, '\\"')}"`;
    })
    .join(" ");
}

export type EnvParse =
  | { ok: true; env: Record<string, string> | undefined }
  | { ok: false; error: string };

export function parseEnv(input: string): EnvParse {
  const text = input.trim();
  if (!text) return { ok: true, env: undefined };

  if (text.startsWith("{")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, error: "Environment JSON is not valid." };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "Environment must be a JSON object." };
    }
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") env[k] = v;
      else if (typeof v === "number" || typeof v === "boolean")
        env[k] = String(v);
      else {
        return {
          ok: false,
          error: `Environment value for ${k} must be a string, number or boolean.`,
        };
      }
    }
    return { ok: true, env };
  }

  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return { ok: true, env };
}

export function normalizeServerId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-");
}
