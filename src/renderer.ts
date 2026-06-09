import type { TUI } from "@earendil-works/pi-tui";
import type { AvatarState, RenderedFrame } from "./types.js";
import { PERSONAS } from "./persona.js";

function randomPick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export class AvatarRenderer {
  private tui: TUI | null = null;
  private current: RenderedFrame | null = null;
  private size: number;
  private personaName = "default";
  private persona = PERSONAS.default;

  constructor(size: number) {
    this.size = size;
  }

  setSize(size: number) {
    this.size = size;
  }

  setTui(tui: TUI | null) {
    this.tui = tui;
  }

  setPersona(name: string) {
    this.personaName = PERSONAS[name] ? name : "default";
    this.persona = PERSONAS[this.personaName] ?? PERSONAS.default;
  }

  getFrame(): RenderedFrame | null {
    return this.current;
  }

  resetCache() {}

  dispose() {
    this.current = null;
  }

  showRandom(state: AvatarState, _force = false): boolean {
    const frames = this.persona[state] ?? this.persona.idle;
    this.current = { kind: "text", lines: [randomPick(frames)] };
    this.tui?.requestRender();
    return true;
  }

  showCycle(state: AvatarState, index: number): boolean {
    const frames = this.persona[state] ?? this.persona.idle;
    const frame = frames[Math.abs(index) % frames.length] ?? frames[0] ?? "(•◡•)";
    this.current = { kind: "text", lines: [frame] };
    this.tui?.requestRender();
    return true;
  }

  count(state: AvatarState): number {
    return (this.persona[state] ?? this.persona.idle).length;
  }
}
