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
- provider-aware cost totals; direct OpenAI GPT-5.6 Luna usage is calculated with the current official rates, and local zero-cost models are shown as `Local`

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

## Cost calculation notes

For direct OpenAI usage with model `gpt-5.6-luna`, costs are calculated locally using the standard rates of $0.20 per 1M input tokens, $0.02 per 1M cached input tokens, $0.25 per 1M cache-write tokens, and $1.20 per 1M output tokens. Requests above 272K input tokens use the documented long-context rates. This override prevents a stale Pi model registry from supplying the old $1/$6 rates. Gateway providers, service-tier surcharges or discounts, regional-processing uplifts, and provider billing adjustments may differ.

## Security notes

- No external command execution in runtime.
- No filesystem writes.
- No network operations.
