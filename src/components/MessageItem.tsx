import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Edit3,
  FileCode2,
  KeyRound,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  ArtifactItem,
  ChatMessage,
  GroqModelInfo,
} from '../types';
import {
  cn,
  extractArtifacts,
  formatBytes,
  parseReasoningAndContent,
} from '../utils/helpers';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MonochromeOrb } from './MonochromeOrb';

interface MessageItemProps {
  message: ChatMessage;
  isStreamingThis: boolean;
  showTelemetry: boolean;
  models: GroqModelInfo[];
  onRegenerate: (messageId: string, overrideModelId?: string) => void;
  onEditUserMessage: (messageId: string, newContent: string) => void;
  onOpenArtifact: (artifact: ArtifactItem) => void;
  onOpenSettings: () => void;
  onRunDemoForLastTurn?: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isStreamingThis,
  showTelemetry,
  models,
  onRegenerate,
  onEditUserMessage,
  onOpenArtifact,
  onOpenSettings,
  onRunDemoForLastTurn,
}) => {
  const [copied, setCopied] = useState(false);
  const [thinkingExpanded, setThinkingExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [speaking, setSpeaking] = useState(false);
  const [retryMenuOpen, setRetryMenuOpen] = useState(false);

  const { reasoning, visibleContent, isThinkingOpen } = useMemo(
    () => parseReasoningAndContent(message.content, message.reasoning),
    [message.content, message.reasoning]
  );

  const artifacts = useMemo(
    () =>
      message.role === 'assistant'
        ? extractArtifacts(visibleContent, message.id)
        : [],
    [message.role, visibleContent, message.id]
  );

  const showThoughtBody = isThinkingOpen || thinkingExpanded;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(visibleContent || message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanSpeech = (visibleContent || message.content)
      .replace(/```[\s\S]*?```/g, ' Code block omitted. ')
      .replace(/[#*_>`~-]/g, ' ');
    const utter = new SpeechSynthesisUtterance(cleanSpeech);
    utter.rate = 1.04;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    setIsEditing(false);
    onEditUserMessage(message.id, editText.trim());
  };

  // USER MESSAGE
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="group flex flex-col items-end gap-2 py-3"
      >
        {/* User Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2 max-w-[85%]">
            {message.attachments.map((att) =>
              att.type === 'image' ? (
                <div
                  key={att.id}
                  className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm max-w-[220px]"
                >
                  <img
                    src={att.content}
                    alt={att.name}
                    className="w-full h-auto max-h-44 object-cover"
                  />
                </div>
              ) : (
                <div
                  key={att.id}
                  className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center gap-2 text-xs"
                >
                  <FileCode2 className="w-4 h-4 text-black dark:text-white shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate max-w-[160px] text-black dark:text-white">
                      {att.name}
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      {formatBytes(att.size)}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {isEditing ? (
          <div className="w-full max-w-xl rounded-2xl border border-black dark:border-white bg-white dark:bg-neutral-950 p-3 shadow-sm">
            <textarea
              autoFocus
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-transparent text-sm text-black dark:text-white outline-none resize-none"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditText(message.content);
                }}
                className="px-3 py-1 rounded-full text-xs text-neutral-500 hover:text-black dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-3.5 py-1 rounded-full text-xs font-medium bg-black text-white dark:bg-white dark:text-black"
              >
                Save & Re-run
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 max-w-[85%] sm:max-w-[78%]">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditText(message.content);
                  setIsEditing(true);
                }}
                title="Edit & Re-run"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCopy}
                title="Copy"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-black dark:text-white" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="rounded-2xl rounded-br-sm px-4 py-2.5 bg-black text-white dark:bg-white dark:text-black text-[14px] leading-relaxed whitespace-pre-wrap break-words shadow-sm">
              {message.content}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // ASSISTANT MESSAGE
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="group py-4 flex items-start gap-3.5"
    >
      {/* Monochrome AI Core Avatar */}
      <div className="pt-0.5 shrink-0">
        <MonochromeOrb
          size="sm"
          state={isStreamingThis ? 'streaming' : 'idle'}
        />
      </div>

      <div className="min-w-0 flex-1 space-y-2.5">
        {/* Header Label */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-tight text-black dark:text-white">
            blue.ai
          </span>
          {message.telemetry?.isDemo && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border border-neutral-300 dark:border-neutral-700 text-neutral-500">
              Studio Demo
            </span>
          )}
        </div>

        {/* Collapsible Reasoning / Thought Process Drawer */}
        {reasoning && (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-950 overflow-hidden">
            <button
              type="button"
              onClick={() => setThinkingExpanded((prev) => !prev)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2 font-medium">
                <Brain
                  className={cn(
                    'w-3.5 h-3.5',
                    isThinkingOpen && 'animate-pulse text-black dark:text-white'
                  )}
                />
                <span>
                  {isThinkingOpen
                    ? 'Thinking deeply...'
                    : message.reasoningDurationMs
                    ? `Thought process (${(
                        message.reasoningDurationMs / 1000
                      ).toFixed(1)}s)`
                    : 'Thought process'}
                </span>
              </span>
              {showThoughtBody ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            <AnimatePresence initial={false}>
              {showThoughtBody && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3.5 pb-3 pt-1 border-t border-neutral-200/70 dark:border-neutral-800/70 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400 font-mono whitespace-pre-wrap">
                    {reasoning}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Error Card (e.g. Missing or Invalid API Key) */}
        {message.error ? (
          <div className="rounded-2xl border border-black dark:border-white bg-neutral-50 dark:bg-neutral-950 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-black dark:text-white shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-black dark:text-white">
                  Groq LPU Connection Required
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {message.error}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onOpenSettings}
                className="h-8 px-3.5 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Connect Groq API Key</span>
              </button>

              {onRunDemoForLastTurn && (
                <button
                  type="button"
                  onClick={onRunDemoForLastTurn}
                  className="h-8 px-3.5 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white text-xs font-medium text-black dark:text-white flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Preview Interactive Demo</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            {visibleContent ? (
              <MarkdownRenderer
                content={visibleContent}
                messageId={message.id}
                onOpenArtifact={onOpenArtifact}
              />
            ) : isStreamingThis && !isThinkingOpen ? (
              <div className="flex items-center gap-1.5 py-2 text-xs text-neutral-400">
                <span className="inline-block w-2 h-4 bg-black dark:bg-white animate-cursor-blink" />
                <span>Streaming from Groq LPU...</span>
              </div>
            ) : null}

            {isStreamingThis && visibleContent && (
              <span className="inline-block w-2 h-4 ml-1 align-middle bg-black dark:bg-white animate-cursor-blink" />
            )}
          </div>
        )}

        {/* Quick Artifact Launch Pills */}
        {!isStreamingThis && artifacts.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {artifacts.map((art) => (
              <button
                key={art.id}
                type="button"
                onClick={() => onOpenArtifact(art)}
                className="h-8 px-3 rounded-xl border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black text-xs font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Open in Split Canvas: {art.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Bottom Actions & Groq Speedometer Telemetry */}
        {!isStreamingThis && !message.error && (
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                title="Copy response"
                className="h-7 px-2 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 flex items-center gap-1 text-[11px] transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-black dark:text-white" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSpeak}
                title={speaking ? 'Stop Reading' : 'Read Aloud'}
                className={cn(
                  'h-7 px-2 rounded-lg flex items-center gap-1 text-[11px] transition-colors',
                  speaking
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
                )}
              >
                {speaking ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Listen</span>
                  </>
                )}
              </button>

              {/* Regenerate + Model Switch Retry */}
              <div className="relative">
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => onRegenerate(message.id)}
                    title="Regenerate response"
                    className="h-7 px-2 rounded-l-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 flex items-center gap-1 text-[11px] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRetryMenuOpen((o) => !o)}
                    title="Retry with another Groq model"
                    className="h-7 px-1 rounded-r-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                {retryMenuOpen && (
                  <div
                    onMouseLeave={() => setRetryMenuOpen(false)}
                    className="absolute left-0 bottom-8 w-56 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl p-1.5 z-20"
                  >
                    <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                      Retry with Model
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {models.slice(0, 7).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setRetryMenuOpen(false);
                            onRegenerate(message.id, m.id);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-700 dark:text-neutral-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black flex items-center justify-between transition-colors"
                        >
                          <span className="truncate">{m.name}</span>
                          <span className="text-[10px] font-mono opacity-60 ml-2 shrink-0">
                            {m.speedLabel}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Groq LPU Telemetry Speedometer Pill */}
            {showTelemetry && message.telemetry && (
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                <span className="inline-flex items-center gap-1 text-black dark:text-white font-semibold">
                  <Zap className="w-3 h-3" />
                  {message.telemetry.tokensPerSec} tok/s
                </span>
                <span>•</span>
                <span>TTFT {message.telemetry.ttftMs}ms</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">
                  {message.telemetry.completionTokens} tok
                </span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline truncate max-w-[140px]">
                  {message.telemetry.model.split('/').pop()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
