# pi-face

Interactive ASCII face status extension for Pi TUI.

It keeps the runtime minimal and self-contained:
- no network calls
- no shell execution in runtime
- no runtime file writes
- no image protocol dependency (ASCII-only renderer)
- expressive persona-based animations

The widget shows:
- an ASCII persona face paired with the current model name
- a compact, theme-colored status panel for agent state, CIX usage, cost, and thinking level
- native Pi cost totals when available; local zero-cost models are shown as `Local`

## Install

```bash
pi install /absolute/path/to/pi-face
```

## What it reacts to

- `session_start` → `hi`
- thinking stream → `think`
- text stream → `talk`
- tool start (`read`/`write`/others) → `read` / `write` / `tool`
- tool end success/error → `success` / `failure`
- compact start/end → `compact` / `idle`

## Personas

Built-in personas:

- `default`
- `bot`
- `cat`

Idle now cycles through awake → drowsy → sleepy/asleep expressions and blinks in between.

## Config

Base file: `config.json`.

Optional overrides:
- `~/.pi/agent/extensions/pi-face/config.json`
- `PROJECT/.pi/extensions/pi-face/config.json`

Supported keys:
- `enabled`
- `size`
- `hideBelow`
- `color`
- `readingSpeed`
- `talkTickMs`
- `cycleMs`
- `holdMs` (`hi`, `success`, `failure`)
- `blinkMs` (`[min,max]`)
- `emotes` (model→persona rules, last match wins)

Example:

```json
{
  "size": 12,
  "emotes": [
    { "model": "*", "set": "default" },
    { "model": "*opus*", "set": "serious" }
  ]
}
```

## Security notes

- No external command execution in runtime.
- No filesystem writes.
- No network operations.
