import type { AvatarConfig, AvatarState } from "./types.js";
import { AvatarRenderer } from "./renderer.js";

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class Animator {
  state: AvatarState = "idle";
  private config: AvatarConfig;
  private renderer: AvatarRenderer;
  private cycleIndex = 0;
  private cycleDir = 1;
  private talkWords = 0;
  private talkStart = 0;
  private lastTalkToken = 0;

  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private blinkTimer: ReturnType<typeof setTimeout> | null = null;
  private talkTimer: ReturnType<typeof setInterval> | null = null;
  private cycleTimer: ReturnType<typeof setInterval> | null = null;
  private idleTimer: ReturnType<typeof setInterval> | null = null;
  private talkEndTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: AvatarConfig, renderer: AvatarRenderer) {
    this.config = config;
    this.renderer = renderer;
  }

  updateConfig(config: AvatarConfig) {
    this.config = config;
    this.renderer.setSize(config.size);
  }

  clearAll() {
    if (this.holdTimer) clearTimeout(this.holdTimer);
    if (this.blinkTimer) clearTimeout(this.blinkTimer);
    if (this.talkTimer) clearInterval(this.talkTimer);
    if (this.cycleTimer) clearInterval(this.cycleTimer);
    if (this.idleTimer) clearInterval(this.idleTimer);
    if (this.talkEndTimer) clearTimeout(this.talkEndTimer);
    this.holdTimer = null;
    this.blinkTimer = null;
    this.talkTimer = null;
    this.cycleTimer = null;
    this.idleTimer = null;
    this.talkEndTimer = null;
  }

  transition(next: AvatarState) {
    this.clearAll();
    this.state = next;

    if (next === "hi") {
      this.renderer.showRandom("hi", true);
      this.holdTimer = setTimeout(() => this.transition("idle"), this.config.holdMs.hi);
      return;
    }
    if (next === "idle") {
      this.renderer.showCycle("idle", 0);
      if (this.renderer.count("idle") > 1) {
        let idx = 0;
        this.idleTimer = setInterval(() => {
          if (this.state !== "idle") return;
          idx += 1;
          this.renderer.showCycle("idle", idx);
        }, 1300);
      }
      this.scheduleBlink();
      return;
    }
    if (next === "think") {
      this.renderer.showRandom("think", true);
      return;
    }
    if (next === "talk") {
      this.enterTalk();
      return;
    }
    if (next === "success") {
      this.renderer.showRandom("success", true);
      this.holdTimer = setTimeout(() => this.transition("idle"), this.config.holdMs.success);
      return;
    }
    if (next === "failure") {
      this.renderer.showRandom("failure", true);
      this.holdTimer = setTimeout(() => this.transition("idle"), this.config.holdMs.failure);
      return;
    }
    if (next === "compact") {
      this.renderer.showRandom("compact", true);
      return;
    }

    this.enterCycle(next);
  }

  onTalkText(text: string) {
    if (this.state !== "talk") return;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    this.talkWords += words;
    this.lastTalkToken = Date.now();
    this.refreshTalkEnd();
  }

  endTalk() {
    if (this.state !== "talk") return;
    this.refreshTalkEnd();
  }

  private scheduleBlink() {
    const delay = rand(this.config.blinkMs[0], this.config.blinkMs[1]);
    this.blinkTimer = setTimeout(() => {
      if (this.state !== "idle") return;
      this.renderer.showRandom("idle", true);
      this.scheduleBlink();
    }, delay);
  }

  private enterTalk() {
    this.talkWords = 0;
    this.talkStart = Date.now();
    this.lastTalkToken = Date.now();
    this.renderer.showRandom("talk", true);
    this.talkTimer = setInterval(() => {
      if (this.state !== "talk") return;
      this.renderer.showRandom("talk");
    }, this.config.talkTickMs);
  }

  private refreshTalkEnd() {
    if (this.talkEndTimer) clearTimeout(this.talkEndTimer);
    const targetMs = (this.talkWords / this.config.readingSpeed) * 1000;
    const elapsed = Date.now() - this.talkStart;
    const remaining = Math.max(120, Math.round(targetMs - elapsed));
    this.talkEndTimer = setTimeout(() => {
      if (this.state !== "talk") return;
      const quiet = Date.now() - this.lastTalkToken;
      if (quiet > 150) this.transition("idle");
      else this.refreshTalkEnd();
    }, remaining);
  }

  private enterCycle(state: AvatarState) {
    this.cycleIndex = 0;
    this.cycleDir = 1;
    this.renderer.showCycle(state, this.cycleIndex);
    const total = this.renderer.count(state);
    if (total <= 1) return;
    this.cycleTimer = setInterval(() => {
      if (this.state !== state) return;
      this.cycleIndex += this.cycleDir;
      if (this.cycleIndex >= total - 1) this.cycleDir = -1;
      if (this.cycleIndex <= 0) this.cycleDir = 1;
      this.renderer.showCycle(state, this.cycleIndex);
    }, this.config.cycleMs);
  }
}
