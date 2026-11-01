import { DEFAULT_GROQ_MODELS } from '../constants/presets';
import {
  ChatMessage,
  GroqModelInfo,
  ModelParameters,
  TelemetryStats,
} from '../types';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

const NON_CHAT_MODEL_PATTERNS = [
  'whisper',
  'playai',
  'tts',
  'orpheus',
  'guard',
  'safeguard',
  'distil-whisper',
];

function isNonChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  return NON_CHAT_MODEL_PATTERNS.some((pat) => lower.includes(pat));
}

export function isVisionCapableModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return (
    lower.includes('vision') ||
    lower.includes('llama-4-scout') ||
    lower.includes('llama-4-maverick')
  );
}

function prettifyModelId(id: string): string {
  const short = id.includes('/') ? id.split('/').pop() || id : id;
  return short
    .split('-')
    .map((part) => {
      if (/^\d+b$/i.test(part)) return part.toUpperCase();
      if (['oss', 'gpt', 'r1', 'ai'].includes(part.toLowerCase())) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

export async function validateAndFetchGroqModels(apiKey: string): Promise<{
  valid: boolean;
  models: GroqModelInfo[];
  latencyMs: number;
  error?: string;
}> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return {
      valid: false,
      models: DEFAULT_GROQ_MODELS,
      latencyMs: 0,
      error: 'API key is empty.',
    };
  }

  const t0 = performance.now();
  try {
    const res = await fetch(`${GROQ_BASE_URL}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${trimmed}`,
      },
    });

    const latencyMs = Math.round(performance.now() - t0);

    if (!res.ok) {
      let errText = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errText = errJson?.error?.message || errText;
      } catch {
        // ignore parse error
      }
      return {
        valid: false,
        models: DEFAULT_GROQ_MODELS,
        latencyMs,
        error: errText,
      };
    }

    const json = await res.json();
    const rawList: Array<{
      id: string;
      owned_by?: string;
      context_window?: number;
      active?: boolean;
    }> = Array.isArray(json?.data) ? json.data : [];

    const presetMap = new Map(DEFAULT_GROQ_MODELS.map((m) => [m.id, m]));
    const merged: GroqModelInfo[] = [];

    // First include curated models that are active in the account (in curated priority order)
    const liveIds = new Set(
      rawList
        .filter((item) => item.active !== false && !isNonChatModel(item.id))
        .map((item) => item.id)
    );

    for (const preset of DEFAULT_GROQ_MODELS) {
      if (liveIds.has(preset.id)) {
        const apiItem = rawList.find((r) => r.id === preset.id);
        merged.push({
          ...preset,
          contextWindow: apiItem?.context_window || preset.contextWindow,
          isLiveFromApi: true,
        });
      }
    }

    // Then append any additional live chat models returned by Groq API
    for (const item of rawList) {
      if (item.active === false || isNonChatModel(item.id)) continue;
      if (presetMap.has(item.id)) continue;
      const lower = item.id.toLowerCase();
      merged.push({
        id: item.id,
        name: prettifyModelId(item.id),
        provider: item.owned_by || 'Groq',
        contextWindow: item.context_window || 131072,
        speedLabel: 'Groq LPU',
        supportsVision: isVisionCapableModel(item.id),
        supportsReasoning:
          lower.includes('r1') ||
          lower.includes('qwen3') ||
          lower.includes('gpt-oss') ||
          lower.includes('reason'),
        description: `Live Groq LPU model (${item.id})`,
        isLiveFromApi: true,
      });
    }

    return {
      valid: true,
      models: merged.length > 0 ? merged : DEFAULT_GROQ_MODELS,
      latencyMs,
    };
  } catch (err) {
    return {
      valid: false,
      models: DEFAULT_GROQ_MODELS,
      latencyMs: Math.round(performance.now() - t0),
      error: err instanceof Error ? err.message : 'Network connection failed',
    };
  }
}

function buildApiMessages(
  history: ChatMessage[],
  systemPrompt: string,
  targetModelSupportsVision: boolean
) {
  const apiMessages: Array<Record<string, unknown>> = [];

  if (systemPrompt.trim()) {
    apiMessages.push({
      role: 'system',
      content: systemPrompt.trim(),
    });
  }

  for (let i = 0; i < history.length; i++) {
    const msg = history[i];
    if (msg.role === 'system') continue;

    // Strip internal <think> blocks from historical assistant turns so context stays clean
    if (msg.role === 'assistant') {
      const cleaned = msg.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      apiMessages.push({
        role: 'assistant',
        content: cleaned || msg.content,
      });
      continue;
    }

    // User turn: attach text files into prompt text, and images if vision model
    const fileAttachments = (msg.attachments || []).filter((a) => a.type === 'file');
    const imageAttachments = (msg.attachments || []).filter((a) => a.type === 'image');

    let textPayload = msg.content || '';
    if (fileAttachments.length > 0) {
      const fileBlocks = fileAttachments
        .map(
          (f) =>
            `\n\n--- Attached File: ${f.name} ---\n\`\`\`\n${f.content}\n\`\`\``
        )
        .join('');
      textPayload = `${textPayload}${fileBlocks}`.trim();
    }

    const isLatestTurn = i === history.length - 1;
    if (
      targetModelSupportsVision &&
      imageAttachments.length > 0 &&
      isLatestTurn
    ) {
      const parts: Array<Record<string, unknown>> = [];
      if (textPayload) {
        parts.push({ type: 'text', text: textPayload });
      } else {
        parts.push({ type: 'text', text: 'Analyze this image carefully.' });
      }
      for (const img of imageAttachments.slice(0, 5)) {
        parts.push({
          type: 'image_url',
          image_url: { url: img.content },
        });
      }
      apiMessages.push({
        role: 'user',
        content: parts,
      });
    } else {
      apiMessages.push({
        role: 'user',
        content: textPayload || '(Image attached)',
      });
    }
  }

  return apiMessages;
}

export interface StreamCallbacks {
  onDelta: (update: {
    content: string;
    reasoning: string;
    reasoningDurationMs?: number;
  }) => void;
  onComplete: (telemetry: TelemetryStats) => void;
  onError: (errMessage: string) => void;
}

export async function streamGroqChat({
  apiKey,
  modelId,
  messages,
  systemPrompt,
  params,
  signal,
  callbacks,
}: {
  apiKey: string;
  modelId: string;
  messages: ChatMessage[];
  systemPrompt: string;
  params: ModelParameters;
  signal: AbortSignal;
  callbacks: StreamCallbacks;
}): Promise<void> {
  const latestUserMsg = messages[messages.length - 1];
  const hasImagesInLatest = Boolean(
    latestUserMsg?.attachments?.some((a) => a.type === 'image')
  );

  // Auto-upgrade to Llama 4 Scout Vision if user attached an image on a text-only model
  const effectiveModel =
    hasImagesInLatest && !isVisionCapableModel(modelId)
      ? 'meta-llama/llama-4-scout-17b-16e-instruct'
      : modelId;

  const fullSystem = params.customSystemSuffix.trim()
    ? `${systemPrompt}\n\nAdditional Instructions:\n${params.customSystemSuffix.trim()}`
    : systemPrompt;

  const apiMessages = buildApiMessages(
    messages,
    fullSystem,
    isVisionCapableModel(effectiveModel)
  );

  const isCompound = effectiveModel.includes('compound');
  const body: Record<string, unknown> = {
    model: effectiveModel,
    messages: apiMessages,
    stream: params.stream,
    temperature: params.temperature,
  };

  if (!isCompound) {
    body.max_completion_tokens = params.maxTokens;
    body.top_p = params.topP;
  }

  const startTime = performance.now();
  let firstTokenTime: number | null = null;
  let reasoningStartTime: number | null = null;
  let reasoningEndTime: number | null = null;

  let fullContent = '';
  let fullReasoning = '';

  let usageStats: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    completionTimeSec?: number;
  } = {};

  try {
    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      let errMessage = `Groq API Error (HTTP ${res.status})`;
      try {
        const errJson = await res.json();
        errMessage = errJson?.error?.message || errMessage;
      } catch {
        const txt = await res.text().catch(() => '');
        if (txt) errMessage = txt.slice(0, 240);
      }
      callbacks.onError(errMessage);
      return;
    }

    if (!params.stream) {
      const data = await res.json();
      const totalSec = Math.max(0.05, (performance.now() - startTime) / 1000);
      const choice = data?.choices?.[0]?.message;
      fullContent = choice?.content || '';
      fullReasoning = choice?.reasoning || '';
      const usage = data?.usage || {};
      const completionTokens =
        usage.completion_tokens || Math.max(1, Math.ceil(fullContent.length / 4));
      const completionTime = usage.completion_time || totalSec;

      callbacks.onDelta({
        content: fullContent,
        reasoning: fullReasoning,
      });

      callbacks.onComplete({
        ttftMs: Math.round(totalSec * 1000),
        tokensPerSec: Math.round(completionTokens / Math.max(0.02, completionTime)),
        promptTokens: usage.prompt_tokens || 0,
        completionTokens,
        totalTokens: usage.total_tokens || completionTokens,
        totalTimeSec: Number(totalSec.toFixed(2)),
        model: effectiveModel,
      });
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      callbacks.onError('ReadableStream not supported in this environment.');
      return;
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || !line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;

        try {
          const parsed = JSON.parse(payload);
          const delta = parsed?.choices?.[0]?.delta;

          if (delta) {
            const deltaReasoning: string = delta.reasoning || '';
            const deltaContent: string = delta.content || '';

            if ((deltaReasoning || deltaContent) && firstTokenTime === null) {
              firstTokenTime = performance.now();
            }

            if (deltaReasoning) {
              if (reasoningStartTime === null) reasoningStartTime = performance.now();
              fullReasoning += deltaReasoning;
            }

            if (deltaContent) {
              if (reasoningStartTime !== null && reasoningEndTime === null) {
                reasoningEndTime = performance.now();
              }
              fullContent += deltaContent;
            }

            if (deltaReasoning || deltaContent) {
              const rDur =
                reasoningStartTime !== null
                  ? Math.round(
                      (reasoningEndTime || performance.now()) - reasoningStartTime
                    )
                  : undefined;

              callbacks.onDelta({
                content: fullContent,
                reasoning: fullReasoning,
                reasoningDurationMs: rDur,
              });
            }
          }

          // Capture usage from Groq x_groq or top-level usage
          const u = parsed?.x_groq?.usage || parsed?.usage;
          if (u) {
            usageStats = {
              promptTokens: u.prompt_tokens,
              completionTokens: u.completion_tokens,
              totalTokens: u.total_tokens,
              completionTimeSec: u.completion_time,
            };
          }
        } catch {
          // Ignore malformed partial chunk
        }
      }
    }

    const endTime = performance.now();
    const totalSec = Math.max(0.05, (endTime - startTime) / 1000);
    const ttftMs = firstTokenTime
      ? Math.round(firstTokenTime - startTime)
      : Math.round(totalSec * 1000);

    const estimatedTokens = Math.max(
      1,
      Math.ceil((fullContent.length + fullReasoning.length) / 3.8)
    );
    const completionTokens = usageStats.completionTokens || estimatedTokens;
    const streamDurationSec =
      usageStats.completionTimeSec ||
      Math.max(0.04, (endTime - (firstTokenTime || startTime)) / 1000);

    const tokensPerSec = Math.round(completionTokens / streamDurationSec);

    callbacks.onComplete({
      ttftMs,
      tokensPerSec,
      promptTokens: usageStats.promptTokens || 0,
      completionTokens,
      totalTokens: usageStats.totalTokens || completionTokens,
      totalTimeSec: Number(totalSec.toFixed(2)),
      model: effectiveModel,
    });
  } catch (err) {
    if (signal.aborted) {
      const endTime = performance.now();
      const totalSec = Math.max(0.05, (endTime - startTime) / 1000);
      const estTokens = Math.max(1, Math.ceil(fullContent.length / 4));
      callbacks.onComplete({
        ttftMs: firstTokenTime ? Math.round(firstTokenTime - startTime) : 0,
        tokensPerSec: Math.round(estTokens / totalSec),
        promptTokens: 0,
        completionTokens: estTokens,
        totalTokens: estTokens,
        totalTimeSec: Number(totalSec.toFixed(2)),
        model: effectiveModel,
      });
      return;
    }
    callbacks.onError(
      err instanceof Error ? err.message : 'Unexpected streaming error'
    );
  }
}

export async function transcribeAudioWithGroq(
  apiKey: string,
  audioBlob: Blob
): Promise<{ text: string; error?: string }> {
  try {
    const formData = new FormData();
    const ext = audioBlob.type.includes('wav')
      ? 'wav'
      : audioBlob.type.includes('ogg')
      ? 'ogg'
      : 'webm';
    formData.append('file', audioBlob, `voice_note.${ext}`);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');

    const res = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      return {
        text: '',
        error: errJson?.error?.message || `Transcription failed (HTTP ${res.status})`,
      };
    }

    const data = await res.json();
    return { text: (data?.text || '').trim() };
  } catch (err) {
    return {
      text: '',
      error: err instanceof Error ? err.message : 'Transcription error',
    };
  }
}

export async function generateAutoTitle(
  apiKey: string,
  firstUserText: string
): Promise<string> {
  const cleanFallback =
    firstUserText
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 44) + (firstUserText.trim().length > 44 ? '…' : '');

  if (!apiKey.trim()) return cleanFallback || 'New Thread';

  try {
    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0.3,
        max_completion_tokens: 20,
        messages: [
          {
            role: 'system',
            content:
              'Generate a crisp 2-to-5 word title for this conversation. Output ONLY the title words, no quotes, no punctuation at the end.',
          },
          {
            role: 'user',
            content: firstUserText.slice(0, 400),
          },
        ],
      }),
    });

    if (!res.ok) return cleanFallback || 'New Thread';
    const data = await res.json();
    const raw = (data?.choices?.[0]?.message?.content || '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/^["']|["']$/g, '')
      .trim();
    return raw ? raw.slice(0, 52) : cleanFallback;
  } catch {
    return cleanFallback || 'New Thread';
  }
}

/**
 * Interactive Studio Demo streamer (used only when user explicitly clicks "Preview Studio Demo"
 * before adding their Groq API key, so they can inspect streaming, thinking drawers, and Live Canvas).
 */
export async function streamStudioDemo({
  prompt,
  modelId,
  signal,
  callbacks,
}: {
  prompt: string;
  modelId: string;
  signal: AbortSignal;
  callbacks: StreamCallbacks;
}): Promise<void> {
  const lower = prompt.toLowerCase();
  const wantsHtml =
    lower.includes('html') ||
    lower.includes('widget') ||
    lower.includes('pomodoro') ||
    lower.includes('synth') ||
    lower.includes('timer') ||
    lower.includes('ui') ||
    lower.includes('game') ||
    lower.includes('calculator');

  const demoThought = wantsHtml
    ? `Analyzing UI architecture request for "${prompt.slice(0, 60)}".\nDesigning a pure monochrome (#000000 / #FFFFFF) self-contained interactive widget with zero external dependencies, crisp typography, and smooth state transitions so it renders live in the Split-Screen Artifact Canvas.`
    : `Structuring a concise, high-signal response for "${prompt.slice(0, 60)}".\nOrganizing key architecture points, performance benchmarks, and actionable examples in clean monochrome formatting.`;

  const demoBody = wantsHtml
    ? `Here is a self-contained **Monochrome Focus & Rhythm Studio** artifact. Click **Live Preview** on the code block (or open the Canvas drawer) to interact with it directly!\n\n\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Monochrome Focus Studio</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: Inter, -apple-system, sans-serif; }
    body { background: #ffffff; color: #000000; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; transition: all 0.3s ease; }
    body.invert { background: #000000; color: #ffffff; }
    .card { width: 100%; max-width: 380px; border: 1.5px solid currentColor; border-radius: 24px; padding: 28px; text-align: center; }
    .badge { display: inline-block; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; border: 1px solid currentColor; padding: 4px 10px; border-radius: 99px; margin-bottom: 18px; }
    .time { font-size: 64px; font-weight: 700; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; margin: 8px 0 22px; }
    .row { display: flex; gap: 10px; justify-content: center; margin-bottom: 18px; }
    button { cursor: pointer; font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 99px; border: 1.5px solid currentColor; background: transparent; color: inherit; transition: transform 0.15s ease, background 0.2s ease; }
    button:active { transform: scale(0.95); }
    button.primary { background: #000000; color: #ffffff; border-color: #000000; }
    body.invert button.primary { background: #ffffff; color: #000000; border-color: #ffffff; }
    .ring-bar { height: 4px; background: rgba(128,128,128,0.22); border-radius: 99px; overflow: hidden; margin-bottom: 20px; }
    .fill { height: 100%; background: currentColor; width: 100%; transition: width 0.5s linear; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">blue.ai • Focus Canvas</div>
    <div class="time" id="display">25:00</div>
    <div class="ring-bar"><div class="fill" id="bar"></div></div>
    <div class="row">
      <button class="primary" id="toggleBtn" onclick="toggleTimer()">Start Session</button>
      <button onclick="resetTimer()">Reset</button>
      <button onclick="document.body.classList.toggle('invert')">Invert</button>
    </div>
  </div>
  <script>
    let total = 25 * 60, left = total, timer = null;
    function render() {
      const m = String(Math.floor(left / 60)).padStart(2, '0');
      const s = String(left % 60).padStart(2, '0');
      document.getElementById('display').textContent = m + ':' + s;
      document.getElementById('bar').style.width = ((left / total) * 100) + '%';
    }
    function toggleTimer() {
      const btn = document.getElementById('toggleBtn');
      if (timer) { clearInterval(timer); timer = null; btn.textContent = 'Resume'; }
      else {
        btn.textContent = 'Pause';
        timer = setInterval(() => { if (left > 0) { left--; render(); } else { clearInterval(timer); } }, 1000);
      }
    }
    function resetTimer() {
      clearInterval(timer); timer = null; left = total;
      document.getElementById('toggleBtn').textContent = 'Start Session';
      render();
    }
  </script>
</body>
</html>
\`\`\`

> **Tip:** Paste your real **Groq API Key** (\`gsk_...\`) in **Settings (\`Ctrl + ,\`)** anytime to unlock live Groq LPU inference across Llama 4, Llama 3.3 70B, Qwen 3, and GPT-OSS!`
    : `### Studio Preview Mode Active ⚡

Namaste! Yeh **blue.ai Desktop Studio** ka interactive demo response hai — taaki aap animations, **Thought Process** drawer, Markdown tables, aur UI feel turant test kar sako!

| Capability | Architecture inside blue.ai | Shortcut / Action |
| :--- | :--- | :--- |
| **Groq LPU Streaming** | Direct SSE stream + live \`tok/s\` & \`TTFT\` meter | Connect Key in \`Ctrl + ,\` |
| **Live Artifact Canvas** | Sandboxed HTML/CSS/SVG split-pane preview | Click **Live Preview** on HTML code |
| **Voice Input (Whisper)** | Real-time mic waveform + \`whisper-large-v3-turbo\` | Mic button in composer |
| **Command Palette** | Instant model, persona & thread switcher | Press \`Ctrl + K\` / \`⌘K\` |
| **Slash Prompts** | Reusable prompt templates & Hinglish helpers | Type \`/\` in message box |

\`\`\`typescript
// Clean Groq LPU Streaming Example
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: \`Bearer \${GROQ_API_KEY}\`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: '${modelId}', stream: true, messages }),
});
\`\`\`

Apni real **Groq API Key (\`gsk_...\`)** top bar ke **Connect Groq Key** button mein paste karte hi live Groq AI models activate ho jayenge!`;

  const start = performance.now();
  let accReasoning = '';
  let accContent = '';

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

  const rChunks = demoThought.match(/.{1,14}/gs) || [];
  for (const chunk of rChunks) {
    if (signal.aborted) return;
    accReasoning += chunk;
    callbacks.onDelta({
      content: '',
      reasoning: accReasoning,
      reasoningDurationMs: Math.round(performance.now() - start),
    });
    await sleep(16);
  }

  const rDur = Math.round(performance.now() - start);
  const cChunks = demoBody.match(/.{1,18}/gs) || [];
  for (const chunk of cChunks) {
    if (signal.aborted) break;
    accContent += chunk;
    callbacks.onDelta({
      content: accContent,
      reasoning: accReasoning,
      reasoningDurationMs: rDur,
    });
    await sleep(14);
  }

  const totalSec = Math.max(0.1, (performance.now() - start) / 1000);
  const tokens = Math.ceil((accContent.length + accReasoning.length) / 4);
  callbacks.onComplete({
    ttftMs: 92,
    tokensPerSec: 540,
    promptTokens: 28,
    completionTokens: tokens,
    totalTokens: tokens + 28,
    totalTimeSec: Number(totalSec.toFixed(2)),
    model: modelId,
    isDemo: true,
  });
}
