import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  BookMarked,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '../constants/presets';
import { validateAndFetchGroqModels } from '../services/groq';
import {
  AppSettings,
  Conversation,
  GroqModelInfo,
  Persona,
  PromptTemplate,
} from '../types';
import {
  cn,
  openExternalUrl,
  saveFileUniversal,
  uid,
} from '../utils/helpers';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = 'max-w-xl',
}) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'w-full max-h-[86vh] rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl flex flex-col overflow-hidden',
            maxWidthClass
          )}
        >
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-black dark:text-white">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ==================== 1. SETTINGS & GROQ API MODAL ==================== */

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  models: GroqModelInfo[];
  onSyncModels: (models: GroqModelInfo[]) => void;
  onExportBackup: () => void;
  onClearAllThreads: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  models,
  onSyncModels,
  onExportBackup,
  onClearAllThreads,
}) => {
  const [keyDraft, setKeyDraft] = useState(settings.groqApiKey);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setKeyDraft(settings.groqApiKey);
      setTestResult(null);
    }
  }, [isOpen, settings.groqApiKey]);

  const handleSaveAndVerify = async () => {
    const trimmed = keyDraft.trim();
    onUpdateSettings({ groqApiKey: trimmed });

    if (!trimmed) {
      setTestResult({
        ok: false,
        msg: 'API key cleared. Studio Demo mode remains available.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);
    const res = await validateAndFetchGroqModels(trimmed);
    setTesting(false);

    if (res.valid) {
      onSyncModels(res.models);
      setTestResult({
        ok: true,
        msg: `Connected to Groq LPU (${res.latencyMs}ms) • ${res.models.length} live chat models synced!`,
      });
    } else {
      setTestResult({
        ok: false,
        msg: res.error || 'Could not verify Groq API key.',
      });
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Groq LPU & Studio Settings"
      subtitle="Connect your Groq API key, manage defaults, and view desktop shortcuts"
    >
      <div className="space-y-6 text-xs">
        {/* Groq API Key Card */}
        <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-black dark:text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              <span>Groq API Key</span>
            </span>
            <button
              type="button"
              onClick={() => openExternalUrl('https://console.groq.com/keys')}
              className="inline-flex items-center gap-1 text-[11px] font-medium underline underline-offset-4 text-black dark:text-white hover:opacity-75"
            >
              <span>Get free key at console.groq.com</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                placeholder="gsk_..."
                className="w-full h-9 pl-3 pr-9 rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 focus:border-black dark:focus:border-white font-mono text-xs text-black dark:text-white outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white"
              >
                {showKey ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveAndVerify}
              disabled={testing}
              className="h-9 px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity shrink-0"
            >
              {testing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Save & Verify</span>
            </button>
          </div>

          <p className="text-[11px] text-neutral-500">
            Stored locally on your device only. Supports live Chat Streaming, Vision (Llama 4), and Voice Transcription (Whisper Large v3 Turbo).
          </p>

          {testResult && (
            <div
              className={cn(
                'p-2.5 rounded-xl border text-[11px] font-medium',
                testResult.ok
                  ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                  : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-neutral-800 dark:text-neutral-200'
              )}
            >
              {testResult.msg}
            </div>
          )}
        </div>

        {/* Preferences */}
        <div className="space-y-3">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
            Preferences
          </h3>

          <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <p className="font-medium text-black dark:text-white">
                Default Groq Model
              </p>
              <p className="text-[11px] text-neutral-500">
                Used when starting a new thread
              </p>
            </div>
            <select
              value={settings.defaultModelId}
              onChange={(e) =>
                onUpdateSettings({ defaultModelId: e.target.value })
              }
              className="h-8 px-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white outline-none max-w-[210px]"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <p className="font-medium text-black dark:text-white">
                Show LPU Speedometer Badge
              </p>
              <p className="text-[11px] text-neutral-500">
                Display tokens/sec, TTFT latency, and token counts under replies
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ showTelemetry: !settings.showTelemetry })
              }
              className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                settings.showTelemetry
                  ? 'bg-black dark:bg-white'
                  : 'bg-neutral-300 dark:bg-neutral-800'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  settings.showTelemetry
                    ? 'translate-x-5 bg-white dark:bg-black'
                    : 'translate-x-0 bg-white dark:bg-neutral-400'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <p className="font-medium text-black dark:text-white">
                Send Message on Enter
              </p>
              <p className="text-[11px] text-neutral-500">
                Use Shift + Enter for new line
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ sendOnEnter: !settings.sendOnEnter })
              }
              className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                settings.sendOnEnter
                  ? 'bg-black dark:bg-white'
                  : 'bg-neutral-300 dark:bg-neutral-800'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  settings.sendOnEnter
                    ? 'translate-x-5 bg-white dark:bg-black'
                    : 'translate-x-0 bg-white dark:bg-neutral-400'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="space-y-2">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
            Desktop Shortcuts
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {KEYBOARD_SHORTCUTS.map((sc) => (
              <div
                key={sc.label}
                className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
              >
                <span className="text-neutral-600 dark:text-neutral-300">
                  {sc.label}
                </span>
                <div className="flex items-center gap-1">
                  {sc.keys.map((k) => (
                    <kbd
                      key={k}
                      className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-mono text-[10px] text-black dark:text-white"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Management */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={onExportBackup}
            className="h-8 px-3.5 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white font-medium text-black dark:text-white transition-colors"
          >
            Export Full Workspace (.json)
          </button>

          <button
            type="button"
            onClick={onClearAllThreads}
            className="h-8 px-3.5 rounded-full border border-neutral-300 dark:border-neutral-700 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Threads</span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

/* ==================== 2. PERSONA STUDIO MODAL ==================== */

interface PersonasModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Persona[];
  activePersonaId: string;
  onSelectPersona: (id: string) => void;
  onAddPersona: (p: Persona) => void;
  onDeletePersona: (id: string) => void;
}

export const PersonasModal: React.FC<PersonasModalProps> = ({
  isOpen,
  onClose,
  personas,
  activePersonaId,
  onSelectPersona,
  onAddPersona,
  onDeletePersona,
}) => {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temp, setTemp] = useState(0.6);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !systemPrompt.trim()) return;
    const newP: Persona = {
      id: uid('persona'),
      name: name.trim(),
      tagline: tagline.trim() || 'Custom AI Persona',
      systemPrompt: systemPrompt.trim(),
      temperature: temp,
      icon: 'Sparkles',
      isCustom: true,
    };
    onAddPersona(newP);
    onSelectPersona(newP.id);
    setName('');
    setTagline('');
    setSystemPrompt('');
    setCreating(false);
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="AI Persona Studio"
      subtitle="Switch assistant modes or craft custom system personas"
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setCreating((c) => !c)}
            className="h-8 px-3.5 rounded-full bg-black text-white dark:bg-white dark:text-black font-medium flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{creating ? 'Cancel' : 'New Custom Persona'}</span>
          </button>
        </div>

        {creating && (
          <form
            onSubmit={handleCreate}
            className="p-4 rounded-2xl border border-black dark:border-white bg-neutral-50 dark:bg-neutral-900/70 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Persona Name (e.g. Startup CTO)"
                className="h-9 px-3 rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 text-black dark:text-white outline-none"
              />
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Short tagline..."
                className="h-9 px-3 rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 text-black dark:text-white outline-none"
              />
            </div>
            <textarea
              required
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="System instructions for how this persona thinks and responds..."
              className="w-full p-3 rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 text-black dark:text-white outline-none resize-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">Temperature: {temp}</span>
                <input
                  type="range"
                  min={0}
                  max={1.2}
                  step={0.1}
                  value={temp}
                  onChange={(e) => setTemp(parseFloat(e.target.value))}
                  className="w-28 mono-slider"
                />
              </div>
              <button
                type="submit"
                className="h-8 px-4 rounded-full bg-black text-white dark:bg-white dark:text-black font-medium"
              >
                Save Persona
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {personas.map((p) => {
            const active = p.id === activePersonaId;
            return (
              <div
                key={p.id}
                onClick={() => {
                  onSelectPersona(p.id);
                  onClose();
                }}
                className={cn(
                  'p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3',
                  active
                    ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white bg-white dark:bg-neutral-950 text-black dark:text-white'
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {p.name}
                    </span>
                    {p.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePersona(p.id);
                        }}
                        className="p-1 rounded opacity-70 hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p
                    className={cn(
                      'text-[11px]',
                      active
                        ? 'text-white/75 dark:text-black/75'
                        : 'text-neutral-500'
                    )}
                  >
                    {p.tagline}
                  </p>
                  <p
                    className={cn(
                      'text-[11px] line-clamp-2 pt-1',
                      active
                        ? 'text-white/65 dark:text-black/65'
                        : 'text-neutral-400'
                    )}
                  >
                    {p.systemPrompt}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono opacity-75">
                  <span>Temp {p.temperature}</span>
                  <span>{active ? 'ACTIVE' : 'SELECT →'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
};

/* ==================== 3. PROMPT VAULT MODAL ==================== */

interface PromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: PromptTemplate[];
  onInsertPrompt: (content: string) => void;
  onAddPrompt: (tpl: PromptTemplate) => void;
  onDeletePrompt: (id: string) => void;
}

export const PromptsModal: React.FC<PromptsModalProps> = ({
  isOpen,
  onClose,
  prompts,
  onInsertPrompt,
  onAddPrompt,
  onDeletePrompt,
}) => {
  const [adding, setAdding] = useState(false);
  const [cmd, setCmd] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    const formattedCmd = cmd.trim()
      ? cmd.trim().startsWith('/')
        ? cmd.trim()
        : `/${cmd.trim()}`
      : `/${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    onAddPrompt({
      id: uid('prompt'),
      command: formattedCmd,
      title: title.trim(),
      category: 'Custom',
      content: content.trim(),
      isCustom: true,
    });
    setCmd('');
    setTitle('');
    setContent('');
    setAdding(false);
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Prompt Vault & Slash Commands"
      subtitle="Click any template to load into composer, or type / directly in chat"
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setAdding((a) => !a)}
            className="h-8 px-3.5 rounded-full bg-black text-white dark:bg-white dark:text-black font-medium flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{adding ? 'Cancel' : 'Create Slash Prompt'}</span>
          </button>
        </div>

        {adding && (
          <form
            onSubmit={handleSave}
            className="p-4 rounded-2xl border border-black dark:border-white bg-neutral-50 dark:bg-neutral-900/70 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                placeholder="/command"
                className="h-9 px-3 rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 font-mono text-black dark:text-white outline-none"
              />
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Template Title"
                className="sm:col-span-2 h-9 px-3 rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 text-black dark:text-white outline-none"
              />
            </div>
            <textarea
              required
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Prompt template text..."
              className="w-full p-3 rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 text-black dark:text-white outline-none resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="h-8 px-4 rounded-full bg-black text-white dark:bg-white dark:text-black font-medium"
              >
                Save to Vault
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {prompts.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => {
                onInsertPrompt(tpl.content);
                onClose();
              }}
              className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white cursor-pointer transition-colors flex items-start justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-black text-white dark:bg-white dark:text-black font-mono text-[11px] font-semibold">
                    {tpl.command}
                  </span>
                  <span className="font-semibold text-black dark:text-white">
                    {tpl.title}
                  </span>
                  <span className="text-[10px] font-mono uppercase text-neutral-400">
                    • {tpl.category}
                  </span>
                </div>
                <p className="text-neutral-500 line-clamp-2">{tpl.content}</p>
              </div>

              {tpl.isCustom ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePrompt(tpl.id);
                  }}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ) : (
                <BookMarked className="w-4 h-4 text-neutral-400 shrink-0 mt-1" />
              )}
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
};

/* ==================== 4. LPU TELEMETRY ANALYTICS MODAL ==================== */

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  conversations,
}) => {
  const stats = useMemo(() => {
    let totalTokens = 0;
    let speedSum = 0;
    let speedCount = 0;
    let peakSpeed = 0;
    let ttftSum = 0;
    let totalMessages = 0;
    const byModel: Record<string, number> = {};

    for (const c of conversations) {
      totalMessages += c.messages.length;
      for (const m of c.messages) {
        if (m.telemetry) {
          totalTokens += m.telemetry.totalTokens || 0;
          if (m.telemetry.tokensPerSec > 0) {
            speedSum += m.telemetry.tokensPerSec;
            speedCount++;
            peakSpeed = Math.max(peakSpeed, m.telemetry.tokensPerSec);
          }
          if (m.telemetry.ttftMs > 0) {
            ttftSum += m.telemetry.ttftMs;
          }
          const shortModel = m.telemetry.model.split('/').pop() || m.telemetry.model;
          byModel[shortModel] =
            (byModel[shortModel] || 0) + (m.telemetry.totalTokens || 1);
        }
      }
    }

    const avgSpeed = speedCount > 0 ? Math.round(speedSum / speedCount) : 0;
    const avgTtft = speedCount > 0 ? Math.round(ttftSum / speedCount) : 0;
    const modelEntries = Object.entries(byModel).sort((a, b) => b[1] - a[1]);
    const maxModelVal = modelEntries[0]?.[1] || 1;

    return {
      totalThreads: conversations.length,
      totalMessages,
      totalTokens,
      avgSpeed,
      peakSpeed,
      avgTtft,
      modelEntries,
      maxModelVal,
    };
  }, [conversations]);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Groq LPU Speed & Telemetry"
      subtitle="Real-time inference speed and token metrics across your workspace"
    >
      <div className="space-y-6 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <p className="text-[10px] font-mono uppercase text-neutral-400">
              Avg LPU Speed
            </p>
            <p className="text-xl font-bold mt-1 text-black dark:text-white flex items-center gap-1">
              <Zap className="w-4 h-4" />
              {stats.avgSpeed || '—'}
            </p>
            <p className="text-[10px] text-neutral-500">tokens / sec</p>
          </div>

          <div className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <p className="text-[10px] font-mono uppercase text-neutral-400">
              Peak Burst
            </p>
            <p className="text-xl font-bold mt-1 text-black dark:text-white">
              {stats.peakSpeed || '—'}
            </p>
            <p className="text-[10px] text-neutral-500">max tok/s</p>
          </div>

          <div className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <p className="text-[10px] font-mono uppercase text-neutral-400">
              Avg TTFT
            </p>
            <p className="text-xl font-bold mt-1 text-black dark:text-white">
              {stats.avgTtft ? `${stats.avgTtft}ms` : '—'}
            </p>
            <p className="text-[10px] text-neutral-500">first token</p>
          </div>

          <div className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <p className="text-[10px] font-mono uppercase text-neutral-400">
              Total Tokens
            </p>
            <p className="text-xl font-bold mt-1 text-black dark:text-white">
              {stats.totalTokens.toLocaleString()}
            </p>
            <p className="text-[10px] text-neutral-500">
              {stats.totalMessages} messages
            </p>
          </div>
        </div>

        {/* Monochrome Bar Chart by Model */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>Token Volume by Model</span>
            </h3>
          </div>

          {stats.modelEntries.length === 0 ? (
            <div className="py-8 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-400">
              Send a message to start recording Groq LPU telemetry.
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.modelEntries.map(([modelName, count]) => {
                const widthPct = Math.max(
                  4,
                  Math.round((count / stats.maxModelVal) * 100)
                );
                return (
                  <div key={modelName} className="space-y-1">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-black dark:text-white font-medium">
                        {modelName}
                      </span>
                      <span className="text-neutral-500">
                        {count.toLocaleString()} tok
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPct}%` }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                        className="h-full rounded-full bg-black dark:bg-white"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
};
