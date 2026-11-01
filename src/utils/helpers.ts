import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ArtifactItem, Attachment, Conversation } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 45) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Extracts <think>...</think> blocks (including partial streaming <think> blocks)
 * and combines with explicit API reasoning tokens if present.
 */
export function parseReasoningAndContent(
  rawContent: string,
  explicitReasoning?: string
): { reasoning: string; visibleContent: string; isThinkingOpen: boolean } {
  let reasoningParts: string[] = [];
  if (explicitReasoning && explicitReasoning.trim()) {
    reasoningParts.push(explicitReasoning.trim());
  }

  let working = rawContent || '';
  let isThinkingOpen = false;

  // Match completed <think>...</think> blocks
  const closedThinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  working = working.replace(closedThinkRegex, (_match, inner: string) => {
    if (inner.trim()) reasoningParts.push(inner.trim());
    return '';
  });

  // Check if there is an unclosed <think> block currently streaming
  const openIdx = working.toLowerCase().indexOf('<think>');
  if (openIdx !== -1) {
    isThinkingOpen = true;
    const partialThought = working.slice(openIdx + 7).trim();
    if (partialThought) {
      reasoningParts.push(partialThought);
    }
    working = working.slice(0, openIdx);
  }

  return {
    reasoning: reasoningParts.join('\n\n'),
    visibleContent: working.trimStart(),
    isThinkingOpen,
  };
}

/**
 * Extracts runnable HTML/SVG artifacts or substantial code files from markdown.
 */
export function extractArtifacts(markdown: string, messageId: string): ArtifactItem[] {
  const artifacts: ArtifactItem[] = [];
  const fenceRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let idx = 1;

  while ((match = fenceRegex.exec(markdown)) !== null) {
    const lang = (match[1] || 'text').toLowerCase();
    const code = match[2].trim();
    if (!code) continue;

    if (lang === 'html' || lang === 'svg' || (lang === 'xml' && code.startsWith('<svg'))) {
      const normalizedLang = lang === 'xml' ? 'svg' : lang;
      // Extract <title> if present
      const titleMatch = code.match(/<title>(.*?)<\/title>/i);
      artifacts.push({
        id: `${messageId}_artifact_${idx}`,
        title: titleMatch?.[1]?.trim() || `Interactive ${normalizedLang.toUpperCase()} Canvas #${idx}`,
        language: normalizedLang,
        code,
        messageId,
      });
      idx++;
    }
  }

  return artifacts;
}

/**
 * Processes an uploaded File into an Attachment (compressed base64 for images, UTF-8 text for code/docs).
 */
export async function processUploadedFile(file: File): Promise<Attachment> {
  const isImage = file.type.startsWith('image/');

  if (isImage) {
    const dataUrl = await compressImageToDataUrl(file, 1280, 0.86);
    return {
      id: uid('att'),
      name: file.name,
      type: 'image',
      mimeType: file.type || 'image/png',
      size: file.size,
      content: dataUrl,
    };
  }

  // Read as UTF-8 text (limit 140KB so context stays snappy)
  const text = await file.text();
  const clipped =
    text.length > 140_000
      ? `${text.slice(0, 140_000)}\n\n... [Truncated at 140 KB]`
      : text;

  return {
    id: uid('att'),
    name: file.name,
    type: 'file',
    mimeType: file.type || 'text/plain',
    size: file.size,
    content: clipped,
  };
}

function compressImageToDataUrl(
  file: File,
  maxDimension: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(reader.result));
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxDimension && height <= maxDimension && file.size < 900_000) {
          resolve(String(reader.result));
          return;
        }
        const scale = Math.min(maxDimension / width, maxDimension / height, 1);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(outMime, quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function formatConversationAsMarkdown(conv: Conversation): string {
  const lines: string[] = [
    `# ${conv.title}`,
    `> Exported from **blue.ai Desktop Studio** • Model: \`${conv.modelId}\` • ${new Date(
      conv.updatedAt
    ).toLocaleString()}`,
    '',
    '---',
    '',
  ];

  for (const msg of conv.messages) {
    const speaker = msg.role === 'user' ? '### User' : '### blue.ai';
    lines.push(speaker);
    lines.push('');
    const { reasoning, visibleContent } = parseReasoningAndContent(
      msg.content,
      msg.reasoning
    );
    if (reasoning) {
      lines.push('<details><summary>Thought Process</summary>\n');
      lines.push(reasoning);
      lines.push('\n</details>\n');
    }
    lines.push(visibleContent || msg.content);
    if (msg.telemetry) {
      lines.push(
        `\n*⚡ ${msg.telemetry.tokensPerSec} tok/s • TTFT ${msg.telemetry.ttftMs}ms • ${msg.telemetry.totalTokens} tokens*`
      );
    }
    lines.push('\n---\n');
  }

  return lines.join('\n');
}

export async function saveFileUniversal(
  filename: string,
  content: string,
  mimeType = 'text/plain;charset=utf-8'
): Promise<void> {
  if (window.blueDesktop?.saveFile) {
    const ext = filename.split('.').pop() || 'txt';
    await window.blueDesktop.saveFile({
      defaultName: filename,
      content,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function openExternalUrl(url: string) {
  if (window.blueDesktop?.openExternal) {
    window.blueDesktop.openExternal(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
