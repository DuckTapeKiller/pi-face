export type AvatarState =
  | "hi"
  | "idle"
  | "think"
  | "talk"
  | "read"
  | "write"
  | "tool"
  | "success"
  | "failure"
  | "compact";

export type ImageProtocol = "kitty" | "iterm2" | "ascii";

export interface AvatarRule {
  model: string;
  set: string;
}

export interface AvatarConfig {
  enabled: boolean;
  size: number;
  hideBelow: number;
  color: boolean;
  readingSpeed: number;
  talkTickMs: number;
  cycleMs: number;
  holdMs: { hi: number; success: number; failure: number };
  blinkMs: [number, number];
  emotes: AvatarRule[];
}

export type RenderedFrame = { kind: "text"; lines: string[] };
