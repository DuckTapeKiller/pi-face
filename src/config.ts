import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AvatarConfig, AvatarRule } from "./types.js";

const DEFAULT_CONFIG: AvatarConfig = {
  enabled: true,
  size: 10,
  hideBelow: 70,
  color: true,
  readingSpeed: 4,
  talkTickMs: 120,
  cycleMs: 450,
  holdMs: { hi: 1600, success: 1000, failure: 1200 },
  blinkMs: [2800, 5600],
  emotes: [{ model: "*", set: "default" }],
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function safeJson(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseRules(input: unknown): AvatarRule[] {
  if (!Array.isArray(input)) return [];
  const rules: AvatarRule[] = [];
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const model = (row as Record<string, unknown>).model;
    const set = (row as Record<string, unknown>).set;
    if (typeof model !== "string" || typeof set !== "string") continue;
    const modelTrim = model.trim();
    const setTrim = set.trim();
    if (!modelTrim || !setTrim) continue;
    rules.push({ model: modelTrim, set: setTrim });
  }
  return rules;
}

function mergeConfig(base: AvatarConfig, patch: Record<string, unknown>): AvatarConfig {
  const next = { ...base, holdMs: { ...base.holdMs }, blinkMs: [...base.blinkMs] as [number, number] };

  if (typeof patch.enabled === "boolean") next.enabled = patch.enabled;
  if (typeof patch.size === "number") next.size = clamp(Math.round(patch.size), 4, 24);
  if (typeof patch.hideBelow === "number") next.hideBelow = clamp(Math.round(patch.hideBelow), 20, 300);
  if (typeof patch.color === "boolean") next.color = patch.color;
  if (typeof patch.readingSpeed === "number") next.readingSpeed = clamp(patch.readingSpeed, 1, 20);
  if (typeof patch.talkTickMs === "number") next.talkTickMs = clamp(Math.round(patch.talkTickMs), 60, 600);
  if (typeof patch.cycleMs === "number") next.cycleMs = clamp(Math.round(patch.cycleMs), 80, 2000);
  if (patch.holdMs && typeof patch.holdMs === "object" && !Array.isArray(patch.holdMs)) {
    const hold = patch.holdMs as Record<string, unknown>;
    if (typeof hold.hi === "number") next.holdMs.hi = clamp(Math.round(hold.hi), 200, 15000);
    if (typeof hold.success === "number") next.holdMs.success = clamp(Math.round(hold.success), 200, 15000);
    if (typeof hold.failure === "number") next.holdMs.failure = clamp(Math.round(hold.failure), 200, 15000);
  }

  if (Array.isArray(patch.blinkMs) && patch.blinkMs.length === 2) {
    const min = patch.blinkMs[0];
    const max = patch.blinkMs[1];
    if (typeof min === "number" && typeof max === "number") {
      const safeMin = clamp(Math.round(min), 500, 20_000);
      const safeMax = clamp(Math.round(max), safeMin, 30_000);
      next.blinkMs = [safeMin, safeMax];
    }
  }

  const parsedRules = parseRules(patch.emotes);
  if (parsedRules.length > 0) next.emotes = parsedRules;
  return next;
}

export function loadConfig(extDir: string, cwd: string): AvatarConfig {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const layers = [
    join(extDir, "config.json"),
    home ? join(home, ".pi", "agent", "extensions", "pi-face", "config.json") : "",
    join(cwd, ".pi", "extensions", "pi-face", "config.json"),
  ].filter(Boolean);

  let config = { ...DEFAULT_CONFIG, holdMs: { ...DEFAULT_CONFIG.holdMs }, blinkMs: [...DEFAULT_CONFIG.blinkMs] as [number, number] };
  for (const path of layers) {
    const patch = safeJson(path);
    if (!patch) continue;
    config = mergeConfig(config, patch);
  }
  return config;
}
