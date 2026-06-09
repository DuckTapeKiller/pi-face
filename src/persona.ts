import type { AvatarRule, AvatarState } from "./types.js";

export function resolvePersona(modelId: string, rules: AvatarRule[]): string {
  let selected = "default";
  for (const rule of rules) {
    if (globMatch(rule.model, modelId)) selected = rule.set;
  }
  return selected;
}

function globMatch(pattern: string, input: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i").test(input);
}

export const PERSONAS: Record<string, Record<AvatarState, string[]>> = {
  default: {
    hi: ["(^◡^)/", "(^_^)/", "(•◡•)/"],
    idle: ["(-_-)", "(-.-)", "(u_u)", "(-_-)z", "(-.-)zz", "(u_u)zzz"],
    think: ["(•_•)?", "(•-•)?", "(¬_¬ )", "(•̀-•́)"],
    talk: ["(•o•)", "(•O•)", "(•ᴗ•)", "(•‿•)"],
    read: ["(•̀_•́)", "(•_•)[]", "(•◡•)|"],
    write: ["(｡｡)φ", "(•̀ᴗ•́)φ", "(•ᴗ•)φ"],
    tool: ["(•ω•){-}", "(•̀ᴗ•́)و", "(•̀_•́)[*]"],
    success: ["(^_^ )✓", "(•◡•)✓", "(^◡^)b"],
    failure: ["(>_<)", "(;_;)", "(•︵•)"],
    compact: ["(-_-)", "(˘-˘)", "(¦3[▓▓]"],
  },
  cat: {
    hi: ["ฅ^•ﻌ•^ฅ", "ฅ^•ω•^ฅ"],
    idle: ["(=^-ω-^=)", "(=^- . -^=)", "(=^-ㅅ-^=)", "(=^-ω-^=)z", "(=^- . -^=)zz"],
    think: ["(=^･_･^=)?", "(=ↀωↀ=)", "(=｀ω´=)"],
    talk: ["(=^･o･^=)", "(=^･ω･^=)", "(=^･ᆺ･^=)"],
    read: ["(=^･ω･^=)[book]", "(=^-ω-^=)[read]"],
    write: ["(=^･ω･^)φ", "(=ↀωↀ=)φ"],
    tool: ["(=^･ω･^=){tool}", "(=｀ω´=)[*]"],
    success: ["(=^･ω･^=)ﾉ✓", "(=^･^=)b"],
    failure: ["(=；ェ；=)", "(=｀ェ´=)"],
    compact: ["(=^-ω-^=)z"],
  },
  bot: {
    hi: ["[◉_◉]>", "[•_•]/", "[◉‿◉]/"],
    idle: ["[-_-]", "[-.-]", "[_ _]", "[-_-]z", "[-.-]zz"],
    think: ["[•_•]?", "[◉_◉]?", "[¬_¬]"],
    talk: ["[•o•]", "[•O•]", "[•‿•]"],
    read: ["[•_•][doc]", "[◉_◉][read]"],
    write: ["[•_•][kbd]", "[◉‿◉][kbd]"],
    tool: ["[•_•][cfg]", "[◉_◉][tool]"],
    success: ["[✓_✓]", "[◉‿◉]✓"],
    failure: ["[x_x]", "[>_<]"],
    compact: ["[-_-]..."],
  },
};
