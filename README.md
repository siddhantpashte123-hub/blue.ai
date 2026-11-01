# blue.ai — Monochrome AI Desktop Studio

Ultra-clean, pure black-and-white (**Monochrome**) AI Desktop Application powered by **Groq LPU** real-time streaming. Built with **Electron + React + TypeScript + Vite + Tailwind CSS + Framer Motion**.

---

## Key Features

- **Pure White & Pure Black Monochrome UI** — Instant animated theme switcher (`White` `#FFFFFF` / `Black` `#000000`) with zero visual clutter and smooth Framer Motion spring transitions.
- **Native Desktop App (Electron)** — Custom frameless window chrome, Minimize / Maximize / Close controls, Always-on-Top window pin, Native OS Save File dialogs, local disk persistence, and global desktop summon hotkey (`Ctrl/Cmd + Shift + Space`).
- **Blazing Groq LPU Integration**:
  - Real-time SSE token streaming (`https://api.groq.com/openai/v1/chat/completions`)
  - Live **Groq Model Sync** (`/v1/models`) — supports Llama 3.3 70B, Llama 3.1 8B Instant, Llama 4 Scout & Maverick (Vision), GPT-OSS 120B/20B, Qwen 3 32B, DeepSeek R1, and Groq Compound
  - Live **LPU Speedometer** under replies (`tok/s`, `TTFT ms`, token counts)
- **Collapsible Reasoning ("Thought Process") Drawer** — Automatically parses `<think>...</think>` and `reasoning` streams with live timing.
- **Split-Screen Live Artifact Canvas** — Run generated `HTML/CSS/JS` apps and `SVG` graphics live side-by-side inside the app with Desktop/Mobile viewport toggle.
- **Voice Input (Groq Whisper LPU) & Text-to-Speech** — Real-time microphone waveform visualizer + `whisper-large-v3-turbo` transcription + 1-click Read Aloud on AI replies.
- **Multimodal Vision & Code File Attachments** — Drag & drop or paste screenshots (`Ctrl+V`) for Vision models, or attach code/text files for contextual analysis.
- **Command Palette (`Ctrl/Cmd + K`) & Slash Prompts (`/`)** — Switch models, personas, threads, and prompt templates without touching the mouse.
- **AI Persona Studio & Telemetry Analytics** — Built-in personas (including **Studio Core**, **Code Architect**, **Hinglish Companion**, **First Principles**, **Monochrome UI Lab**) + custom persona creator + token speed analytics.

---

## Quick Start (Local Desktop App)

```bash
# 1. Install dependencies
npm install

# 2. Launch Native Electron Desktop App (Dev Mode)
npm run electron:dev

# Or run in Web Studio mode
npm run dev
```

### Build Native Desktop Installers

```bash
# Windows (.exe NSIS installer & Portable)
npm run electron:win

# macOS (.dmg)
npm run electron:mac

# Linux (.AppImage)
npm run electron:linux
```

---

## Connecting Your Groq API Key

1. Get a free API key from [console.groq.com/keys](https://console.groq.com/keys).
2. Paste your `gsk_...` key directly on the **Welcome Screen** or inside **Settings (`Ctrl + ,`)** and click **Save & Verify**.
3. *(Optional)* You can also copy `.env.example` to `.env` and set `VITE_GROQ_API_KEY=gsk_...`.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl / ⌘ + K` | Open Command Palette |
| `Ctrl / ⌘ + N` | Start New Thread |
| `Ctrl / ⌘ + B` | Toggle Sidebar |
| `Ctrl / ⌘ + .` | Toggle LPU Parameter Inspector |
| `Ctrl / ⌘ + ,` | Open Groq API & Studio Settings |
| `Ctrl / ⌘ + Shift + L` | Switch Pure White / Pure Black Theme |
| `Ctrl / ⌘ + Shift + Space` | Global Desktop Summon / Minimize (Electron) |
| `/` | Open Slash Prompt Menu in Composer |
