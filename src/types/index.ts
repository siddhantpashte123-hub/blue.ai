export type ThemeMode = 'light' | 'dark';

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'file';
  mimeType: string;
  size: number;
  /** Data URL for images, or raw text content for code/text files */
  content: string;
}

export interface TelemetryStats {
  ttftMs: number;
  tokensPerSec: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalTimeSec: number;
  model: string;
  isDemo?: boolean;
}

export interface ArtifactItem {
  id: string;
  title: string;
  language: string;
  code: string;
  messageId: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string;
  reasoningDurationMs?: number;
  createdAt: number;
  attachments?: Attachment[];
  telemetry?: TelemetryStats;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  modelId: string;
  personaId: string;
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface GroqModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  speedLabel: string;
  supportsVision?: boolean;
  supportsReasoning?: boolean;
  description: string;
  isLiveFromApi?: boolean;
}

export interface Persona {
  id: string;
  name: string;
  tagline: string;
  systemPrompt: string;
  temperature: number;
  icon: string;
  isCustom?: boolean;
}

export interface PromptTemplate {
  id: string;
  command: string;
  title: string;
  category: string;
  content: string;
  isCustom?: boolean;
}

export interface ModelParameters {
  temperature: number;
  maxTokens: number;
  topP: number;
  stream: boolean;
  customSystemSuffix: string;
}

export interface AppSettings {
  groqApiKey: string;
  theme: ThemeMode;
  defaultModelId: string;
  defaultPersonaId: string;
  sendOnEnter: boolean;
  showTelemetry: boolean;
  framedWindowPreview: boolean;
  soundEffects: boolean;
}

export interface BlueDesktopBridge {
  isElectron: boolean;
  minimize: () => Promise<void>;
  maximize: () => Promise<boolean>;
  close: () => Promise<void>;
  getWindowState: () => Promise<{
    isMaximized: boolean;
    isAlwaysOnTop: boolean;
    platform: string;
  }>;
  setAlwaysOnTop: (flag: boolean) => Promise<boolean>;
  openExternal: (url: string) => Promise<boolean>;
  saveFile: (payload: {
    defaultName: string;
    content: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<{ canceled: boolean; filePath?: string }>;
  readStorage: () => Promise<Record<string, unknown> | null>;
  writeStorage: (data: Record<string, unknown>) => Promise<boolean>;
  onMaximizedChanged: (callback: (isMaximized: boolean) => void) => () => void;
}

declare global {
  interface Window {
    blueDesktop?: BlueDesktopBridge;
  }
}
