import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { loadConfig } from "./config.js";
import { resolvePersona } from "./persona.js";
import { AvatarRenderer } from "./renderer.js";
import { Animator } from "./animator.js";
import type { AvatarState } from "./types.js";

type ContextDetails = {
  percent: number | null;
  tokens: number | null;
  contextWindow: number | null;
  bar: string;
};

type CostStats = {
  total: number;
  last: number;
  source: "native" | "computed" | "local" | "unavailable";
};

type WidgetTheme = {
  fg?: (color: string, text: string) => string;
  bg?: (color: string, text: string) => string;
  bold?: (text: string) => string;
};

type CostResult = {
  amount: number;
  source: CostStats["source"];
};

function toolToState(toolName: string): AvatarState {
  if (toolName === "read") return "read";
  if (toolName === "write" || toolName === "edit") return "write";
  return "tool";
}

function renderWidgetLines(
  width: number,
  frame: ReturnType<AvatarRenderer["getFrame"]>,
  state: AvatarState,
  modelName: string,
  thinkingLevel: string,
  thinkingChars: number,
  contextDetails: ContextDetails,
  costStats: CostStats,
  theme: WidgetTheme | null,
  useColor: boolean,
): string[] {
  if (!frame || width < 20) return [];

  const face = frame.lines[0] ?? "(-_-)";
  const model = modelName || "no model";
  const paint = makePainter(theme, useColor);
  const stateLabel = stateLabelFor(state);
  const stateCode = stateCodeFor(state);
  const activity = stateActivity(state, Date.now(), thinkingChars);
  const stateText = `[${stateCode}] ${stateLabel}${activity ? ` ${activity}` : ""}`.trim();
  const costText = formatCost(costStats);
  const thinkText = formatThinkingLevel(thinkingLevel);
  const contextText = formatContext(contextDetails);

  const innerWidth = Math.max(0, width - 2);
  const border = paint.border;
  const top = border(`┌${"─".repeat(innerWidth)}┐`);
  const divider = border(`├${"─".repeat(innerWidth)}┤`);
  const bottom = border(`└${"─".repeat(innerWidth)}┘`);
  const title = `${paint.face(face)} ${paint.model(model)}`;

  const rows = [
    [
      segment("State", paint.state(stateText, state), paint),
      segment("CIX", paint.context(contextText, contextDetails.percent), paint),
    ],
    [
      segment("Cost", paint.cost(costText, costStats.source), paint),
      segment("Think", paint.think(thinkText), paint),
    ],
  ].map((items) => renderStatusRow(items, width, paint));

  return [top, boxLine(` ${title} `, width, paint), divider, ...rows, bottom];
}

function makePainter(theme: WidgetTheme | null, useColor: boolean) {
  const fg = (color: string, text: string) => (useColor ? theme?.fg?.(color, text) ?? text : text);
  const bg = (color: string, text: string) => (useColor ? theme?.bg?.(color, text) ?? text : text);
  const bold = (text: string) => (useColor ? theme?.bold?.(text) ?? text : text);
  return {
    border: (text: string) => fg("borderMuted", text),
    surface: (text: string) => bg("customMessageBg", text),
    dim: (text: string) => fg("dim", text),
    label: (text: string) => fg("muted", text),
    face: (text: string) => fg("accent", bold(text)),
    model: (text: string) => fg("text", text),
    think: (text: string) => fg("thinkingHigh", text),
    state: (text: string, state: AvatarState) => {
      if (state === "failure") return fg("error", text);
      if (state === "success") return fg("success", text);
      if (state === "think") return fg("thinkingHigh", text);
      if (state === "tool" || state === "read" || state === "write" || state === "compact") return fg("warning", text);
      return fg("accent", text);
    },
    context: (text: string, percent: number | null) => {
      if (percent === null) return fg("dim", text);
      if (percent >= 90) return fg("error", text);
      if (percent >= 70) return fg("warning", text);
      return fg("success", text);
    },
    cost: (text: string, source: CostStats["source"]) => {
      if (source === "unavailable") return fg("dim", text);
      if (source === "local") return fg("success", text);
      return fg("accent", text);
    },
  };
}

function boxLine(content: string, width: number, paint = makePainter(null, false)): string {
  const innerWidth = Math.max(0, width - 2);
  const trimmed = truncateToWidth(content, innerWidth, "…");
  const pad = Math.max(0, innerWidth - visibleWidth(trimmed));
  return `${paint.border("│")}${paint.surface(`${trimmed}${" ".repeat(pad)}`)}${paint.border("│")}`;
}

function segment(label: string, value: string, paint = makePainter(null, false)): string {
  return `${paint.label(label)}: ${value}`;
}

function renderStatusRow(items: string[], width: number, paint = makePainter(null, false)): string {
  const innerWidth = Math.max(0, width - 2);
  const gap = ` ${paint.dim("│")} `;
  const plainGapWidth = visibleWidth(gap);

  if (items.length < 2 || innerWidth < 44) {
    return boxLine(` ${items.join("  ")} `, width, paint);
  }

  const leftMax = Math.max(12, Math.floor((innerWidth - plainGapWidth) * 0.44));
  const rightMax = Math.max(12, innerWidth - plainGapWidth - leftMax);
  const left = truncateToWidth(` ${items[0]}`, leftMax, "…");
  const right = truncateToWidth(items[1], rightMax, "…");
  const line = `${left}${" ".repeat(Math.max(0, leftMax - visibleWidth(left)))}${gap}${right}`;
  return boxLine(line, width, paint);
}

function stateLabelFor(state: AvatarState): string {
  switch (state) {
    case "hi": return "Hello";
    case "idle": return "Idle";
    case "think": return "Thinking";
    case "talk": return "Talking";
    case "read": return "Reading";
    case "write": return "Writing";
    case "tool": return "Tool";
    case "success": return "Success";
    case "failure": return "Failure";
    case "compact": return "Compacting";
    default: return String(state).toUpperCase();
  }
}

function stateCodeFor(state: AvatarState): string {
  switch (state) {
    case "hi": return "HI";
    case "idle": return "IDLE";
    case "think": return "THINK";
    case "talk": return "TALK";
    case "read": return "READ";
    case "write": return "WRITE";
    case "tool": return "TOOL";
    case "success": return "OK";
    case "failure": return "ERR";
    case "compact": return "CMPT";
    default: return String(state).toUpperCase();
  }
}

function stateActivity(state: AvatarState, now: number, thinkingChars: number): string {
  if (state === "think") {
    const spin = ["⠁", "⠃", "⠇", "⠧", "⠷", "⠿", "⠷", "⠧", "⠇", "⠃"];
    const idx = Math.floor(now / 120) % spin.length;
    return `${spin[idx]} ${thinkingChars.toLocaleString()}ch`;
  }
  if (state === "talk") {
    const wave = ["▁▂▁", "▂▃▂", "▃▄▃", "▄▅▄", "▃▄▃", "▂▃▂"];
    const idx = Math.floor(now / 140) % wave.length;
    return wave[idx]!;
  }
  if (state === "idle") {
    const idle = ["z", "zz", "zzz"];
    const idx = Math.floor(now / 600) % idle.length;
    return idle[idx]!;
  }
  return "•";
}

function buildContextDetails(ctxRef: any): ContextDetails {
  const usage = ctxRef?.getContextUsage?.();
  if (!usage || usage.tokens === null || usage.contextWindow === null || usage.percent === null) {
    return { percent: null, tokens: null, contextWindow: usage?.contextWindow ?? null, bar: "░░░░░░░░░░" };
  }

  const pct = usage.percent;
  const barSize = 10;
  const filled = Math.max(0, Math.min(barSize, Math.round((pct / 100) * barSize)));
  const bar = `${"█".repeat(filled)}${"░".repeat(Math.max(0, barSize - filled))}`;
  return {
    percent: pct,
    tokens: usage.tokens,
    contextWindow: usage.contextWindow,
    bar,
  };
}

function formatContext(details: ContextDetails): string {
  if (details.percent === null || details.tokens === null || details.contextWindow === null) {
    if (details.contextWindow) return `?/${details.contextWindow.toLocaleString()} ${details.bar}`;
    return "n/a";
  }
  return `${details.tokens.toLocaleString()}/${details.contextWindow.toLocaleString()} (${details.percent.toFixed(0)}%) ${details.bar}`;
}

function formatCost(stats: CostStats): string {
  if (stats.source === "local") return "Local";
  if (stats.source === "unavailable") return "n/a";
  const totalStr = formatCurrency(stats.total);
  if (stats.last > 0) return `${totalStr} +${formatCurrency(stats.last)}`;
  return totalStr;
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "$0.0000";
  if (value >= 100) return `$${value.toFixed(2)}`;
  if (value >= 10) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(4)}`;
}

function formatThinkingLevel(level: string): string {
  if (!level) return "n/a";
  const trimmed = level.trim();
  if (!trimmed) return "n/a";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function extractCostFromMessage(message: any, modelRegistry: any, activeModel?: any): CostResult {
  const usage = message?.usage;
  if (!usage) return { amount: 0, source: "unavailable" };
  const costTotal = usage.cost?.total;
  if (typeof costTotal === "number" && Number.isFinite(costTotal)) {
    return {
      amount: Math.max(0, costTotal),
      source: costTotal > 0 ? "native" : inferZeroCostSource(message, modelRegistry, activeModel),
    };
  }

  const provider = typeof message?.provider === "string" ? message.provider : undefined;
  const modelId = typeof message?.model === "string"
    ? message.model
    : (typeof message?.model?.id === "string" ? message.model.id : undefined);

  let model: any = activeModel;
  if ((!model || !model.cost) && provider && modelId && modelRegistry?.find) {
    try {
      model = modelRegistry.find(provider, modelId);
    } catch {
      model = undefined;
    }
  }
  if (!model || !model.cost) return { amount: 0, source: inferZeroCostSource(message, modelRegistry, activeModel) };

  const toNumber = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);
  const rates = {
    input: toNumber(model.cost.input),
    output: toNumber(model.cost.output),
    cacheRead: toNumber(model.cost.cacheRead),
    cacheWrite: toNumber(model.cost.cacheWrite),
  };

  const usageInput = toNumber(usage.input);
  const usageOutput = toNumber(usage.output);
  const usageCacheRead = toNumber(usage.cacheRead);
  const usageCacheWrite = toNumber(usage.cacheWrite);

  const computed =
    usageInput * rates.input +
    usageOutput * rates.output +
    usageCacheRead * rates.cacheRead +
    usageCacheWrite * rates.cacheWrite;

  if (!Number.isFinite(computed) || computed <= 0) return { amount: 0, source: inferZeroCostSource(message, modelRegistry, activeModel) };
  return { amount: computed / 1_000_000, source: "computed" };
}

function inferZeroCostSource(message: any, modelRegistry: any, activeModel?: any): CostStats["source"] {
  const activeProvider = typeof activeModel?.provider === "string" ? activeModel.provider.toLowerCase() : "";
  if (activeProvider === "ollama" || activeProvider === "lmstudio" || activeProvider === "local") return "local";
  if (hasZeroCost(activeModel?.cost)) return "local";

  const provider = typeof message?.provider === "string" ? message.provider.toLowerCase() : "";
  if (provider === "ollama" || provider === "lmstudio" || provider === "local") return "local";

  const modelId = typeof message?.model === "string"
    ? message.model
    : (typeof message?.model?.id === "string" ? message.model.id : undefined);
  if (provider && modelId && modelRegistry?.find) {
    try {
      const model = modelRegistry.find(provider, modelId);
      if (hasZeroCost(model?.cost)) return "local";
    } catch {
      return "unavailable";
    }
  }

  return "unavailable";
}

function hasZeroCost(cost: any): boolean {
  return Boolean(cost) && [cost.input, cost.output, cost.cacheRead, cost.cacheWrite]
    .every((value) => typeof value === "number" && Number.isFinite(value) && value === 0);
}

function sumCostFromBranch(sessionManager: any, modelRegistry: any, activeModel?: any): CostStats {
  const entries = sessionManager?.getBranch?.();
  const fallbackSource = inferZeroCostSource(undefined, modelRegistry, activeModel);
  if (!Array.isArray(entries)) return { total: 0, last: 0, source: fallbackSource };
  let sum = 0;
  let source: CostStats["source"] = fallbackSource;
  for (const entry of entries) {
    if (entry?.type !== "message") continue;
    const message = entry.message;
    if (!message || message.role !== "assistant") continue;
    const cost = extractCostFromMessage(message, modelRegistry, activeModel);
    sum += cost.amount;
    source = combineCostSources(source, cost.source);
  }
  return { total: sum, last: 0, source };
}

function combineCostSources(a: CostStats["source"], b: CostStats["source"]): CostStats["source"] {
  if (a === "native" || b === "native") return "native";
  if (a === "computed" || b === "computed") return "computed";
  if (a === "local" || b === "local") return "local";
  return "unavailable";
}

export default function piFace(pi: ExtensionAPI) {
  const extDir = dirname(dirname(fileURLToPath(import.meta.url)));
  let ctxRef: any = null;
  let modelName = "";
  let activeModel: any = null;
  let thinkingChars = 0;
  let cwd = process.cwd();
  let config = loadConfig(extDir, cwd);
  let renderer = new AvatarRenderer(config.size);
  let animator = new Animator(config, renderer);
  let totalCost = 0;
  let lastCost = 0;
  let costSource: CostStats["source"] = "unavailable";

  function requestRender() {
    ctxRef?.ui?.requestRender?.();
  }

  function refreshConfigAndPersona(modelId: string) {
    config = loadConfig(extDir, cwd);
    animator.updateConfig(config);
    if (!config.enabled) return;
    const setName = resolvePersona(modelId, config.emotes);
    renderer.setPersona(setName);
    renderer.resetCache();
    requestRender();
  }

  function setWidget(ctx: any) {
    ctx.ui.setWidget(
      "pi-face",
      (_tui: any, _theme: any) => {
        renderer.setTui(_tui);
        return {
          render(width: number) {
            if (!config.enabled) return [];
            if (width < config.hideBelow) return [];
            const frame = renderer.getFrame();
            const thinkingLevel = pi.getThinkingLevel?.() ?? "high";
            const contextDetails = buildContextDetails(ctxRef);
            const costStats: CostStats = { total: totalCost, last: lastCost, source: costSource };
            return renderWidgetLines(width, frame, animator.state, modelName, thinkingLevel, thinkingChars, contextDetails, costStats, _theme, config.color);
          },
          invalidate() {},
          dispose() {
            renderer.setTui(null);
          },
        };
      },
      { placement: "aboveEditor" },
    );
  }

  function resetCost(ctx: any) {
    const stats = sumCostFromBranch(ctx.sessionManager, ctx.modelRegistry, activeModel);
    totalCost = stats.total;
    lastCost = 0;
    costSource = stats.source;
  }

  pi.on("session_start", async (_event: any, ctx: any) => {
    if (!ctx.hasUI) return;
    ctxRef = ctx;
    thinkingChars = 0;
    cwd = ctx.cwd;
    activeModel = ctx.model;
    modelName = ctx.model?.name ?? "";
    resetCost(ctx);
    refreshConfigAndPersona(ctx.model?.id ?? "");
    if (!config.enabled) return;
    setWidget(ctx);
    animator.clearAll();
    animator.transition("hi");
  });

  pi.on("session_shutdown", async (_event: any, ctx: any) => {
    animator.clearAll();
    renderer.dispose();
    if (ctx.hasUI) ctx.ui.setWidget("pi-face", undefined);
    ctxRef = null;
    totalCost = 0;
    lastCost = 0;
    costSource = "unavailable";
    activeModel = null;
  });

  pi.on("model_select", async (event: any) => {
    activeModel = event.model ?? activeModel;
    modelName = event.model?.name ?? modelName;
    costSource = inferZeroCostSource(undefined, ctxRef?.modelRegistry, activeModel);
    refreshConfigAndPersona(event.model?.id ?? "");
    if (config.enabled && animator.state === "idle") animator.transition("idle");
    requestRender();
  });

  pi.on("message_update", async (event: any) => {
    if (!ctxRef || !config.enabled) return;
    if (event.message?.role !== "assistant") return;
    const streamEvent = event.assistantMessageEvent;
    if (!streamEvent) return;

    if (streamEvent.type === "thinking_start" || streamEvent.type === "thinking_delta") {
      if (streamEvent.type === "thinking_start") {
        thinkingChars = 0;
      } else if (streamEvent.type === "thinking_delta" && typeof streamEvent.delta === "string") {
        thinkingChars += streamEvent.delta.length;
      }
      if (animator.state !== "think") animator.transition("think");
      requestRender();
      return;
    }

    if (streamEvent.type === "toolcall_start") {
      const partial = streamEvent.partial;
      const block = partial?.content?.[streamEvent.contentIndex];
      if (block && "name" in block && block.name) animator.transition(toolToState(block.name));
      else animator.transition("tool");
      return;
    }

    if (streamEvent.type === "text_delta") {
      if (animator.state !== "talk") animator.transition("talk");
      if (streamEvent.delta) animator.onTalkText(streamEvent.delta);
    }
  });

  pi.on("message_end", async (event: any, ctx: any) => {
    if (!config.enabled) return;
    if (event.message?.role !== "assistant") return;
    const last = extractCostFromMessage(event.message, ctx.modelRegistry, activeModel);
    const total = sumCostFromBranch(ctx.sessionManager, ctx.modelRegistry, activeModel);
    lastCost = last.amount;
    totalCost = total.total;
    costSource = combineCostSources(total.source, last.source);
    requestRender();
  });

  pi.on("tool_execution_start", async (event: any) => {
    if (!config.enabled) return;
    animator.transition(toolToState(event.toolName));
  });

  pi.on("tool_execution_end", async (event: any) => {
    if (!config.enabled) return;
    if (event.toolName === "bash" && event.isError) animator.transition("failure");
    else animator.transition("success");
  });

  pi.on("agent_end", async () => {
    if (!config.enabled) return;
    if (animator.state === "talk") animator.endTalk();
    else animator.transition("idle");
  });

  pi.on("session_before_compact", async () => {
    if (!config.enabled) return;
    animator.transition("compact");
  });

  pi.on("session_compact", async (_event: any, ctx: any) => {
    if (!config.enabled) return;
    const stats = sumCostFromBranch(ctx.sessionManager, ctx.modelRegistry, activeModel);
    totalCost = stats.total;
    lastCost = 0;
    costSource = stats.source;
    animator.transition("idle");
    requestRender();
  });
}
