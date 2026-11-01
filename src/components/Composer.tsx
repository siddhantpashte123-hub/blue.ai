import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  Check,
  ChevronDown,
  FileCode2,
  Loader2,
  Mic,
  Paperclip,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import {
  Attachment,
  GroqModelInfo,
  Persona,
  PromptTemplate,
} from '../types';
import { transcribeAudioWithGroq } from '../services/groq';
import { cn, formatBytes, processUploadedFile } from '../utils/helpers';
import { ModelSwitcher } from './ModelSwitcher';

interface ComposerProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  sendOnEnter: boolean;
  apiKey: string;
  models: GroqModelInfo[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  onRefreshModels?: () => Promise<void> | void;
  personas: Persona[];
  selectedPersonaId: string;
  onSelectPersona: (personaId: string) => void;
  prompts: PromptTemplate[];
  externalDraft?: string | null;
  onConsumeExternalDraft?: () => void;
}

export const Composer: React.FC<ComposerProps> = ({
  onSend,
  onStop,
  isStreaming,
  sendOnEnter,
  apiKey,
  models,
  selectedModelId,
  onSelectModel,
  onRefreshModels,
  personas,
  selectedPersonaId,
  onSelectPersona,
  prompts,
  externalDraft,
  onConsumeExternalDraft,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const [personaMenuOpen, setPersonaMenuOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [audioBars, setAudioBars] = useState<number[]>([25, 45, 30, 60, 35, 50, 28, 40]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const activeModel = useMemo(
    () => models.find((m) => m.id === selectedModelId) || models[0],
    [models, selectedModelId]
  );

  const activePersona = useMemo(
    () => personas.find((p) => p.id === selectedPersonaId) || personas[0],
    [personas, selectedPersonaId]
  );

  // Consume external starter or vault prompt
  useEffect(() => {
    if (externalDraft !== null && externalDraft !== undefined) {
      setText(externalDraft);
      onConsumeExternalDraft?.();
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 30);
    }
  }, [externalDraft, onConsumeExternalDraft]);

  // Auto-resize textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 190)}px`;
  }, [text]);

  // Slash command matching when input starts with `/`
  const slashMatches = useMemo(() => {
    if (!text.startsWith('/') || text.includes('\n') || text.includes(' ')) {
      return [];
    }
    const q = text.toLowerCase();
    return prompts.filter(
      (p) =>
        p.command.toLowerCase().startsWith(q) ||
        p.title.toLowerCase().includes(q.slice(1))
    );
  }, [text, prompts]);

  useEffect(() => {
    setSlashIndex(0);
  }, [slashMatches.length]);

  const applySlashPrompt = (tpl: PromptTemplate) => {
    setText(tpl.content);
    setTimeout(() => textareaRef.current?.focus(), 10);
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList).slice(0, 5);
    const processed: Attachment[] = [];
    for (const f of arr) {
      try {
        const att = await processUploadedFile(f);
        processed.push(att);
      } catch {
        // ignore unreadable file
      }
    }
    if (processed.length > 0) {
      setAttachments((prev) => [...prev, ...processed].slice(0, 6));
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      await handleFiles(imageFiles);
    }
  };

  const handleSubmit = () => {
    if (isStreaming) return;
    if (!text.trim() && attachments.length === 0) return;
    onSend(text.trim(), attachments);
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % slashMatches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((i) => (i - 1 + slashMatches.length) % slashMatches.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySlashPrompt(slashMatches[slashIndex]);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && sendOnEnter) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const stopAudioCleanup = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const toggleVoiceRecording = async () => {
    setVoiceError(null);

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      stopAudioCleanup();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Live audio frequency visualizer
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 32;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(dataArray);
          const bars = Array.from({ length: 8 }, (_, idx) => {
            const val = dataArray[idx + 1] || 20;
            return Math.max(18, Math.min(100, Math.round((val / 255) * 100)));
          });
          setAudioBars(bars);
          animFrameRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // Fallback visual pulse if AudioContext restricted
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        stopAudioCleanup();
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size < 200) return;

        if (!apiKey.trim()) {
          setVoiceError('Connect your Groq API Key to transcribe voice with Whisper LPU.');
          return;
        }

        setIsTranscribing(true);
        const res = await transcribeAudioWithGroq(apiKey, blob);
        setIsTranscribing(false);

        if (res.error) {
          setVoiceError(res.error);
        } else if (res.text) {
          setText((prev) => (prev ? `${prev} ${res.text}` : res.text));
          textareaRef.current?.focus();
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setVoiceError('Microphone access unavailable in this browser context.');
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
          await handleFiles(e.dataTransfer.files);
        }
      }}
      className="relative w-full max-w-3xl mx-auto px-3 sm:px-4 pb-3 pt-1"
    >
      {/* Floating Slash Command Menu */}
      <AnimatePresence>
        {slashMatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute left-4 right-4 bottom-full mb-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl p-1.5 z-30"
          >
            <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-neutral-400 flex items-center justify-between">
              <span>Slash Commands</span>
              <span>↑↓ Navigate • Enter</span>
            </div>
            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {slashMatches.map((tpl, idx) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applySlashPrompt(tpl)}
                  className={cn(
                    'w-full px-3 py-2 rounded-xl text-left flex items-center justify-between transition-colors',
                    idx === slashIndex
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs font-semibold">
                      {tpl.command}
                    </span>
                    <span className="text-xs truncate opacity-85">
                      {tpl.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase opacity-60 ml-2 shrink-0">
                    {tpl.category}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Notice */}
      {voiceError && (
        <div className="mb-2 px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
          <span>{voiceError}</span>
          <button
            type="button"
            onClick={() => setVoiceError(null)}
            className="p-0.5 hover:opacity-70"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Monochrome Composer Box */}
      <div
        className={cn(
          'rounded-3xl border bg-white dark:bg-[#0B0B0B] transition-all shadow-sm',
          isDragging
            ? 'border-black dark:border-white ring-2 ring-black/15 dark:ring-white/15'
            : 'border-neutral-200 dark:border-neutral-800 focus-within:border-black dark:focus-within:border-white'
        )}
      >
        {/* Attached Files / Images Strip */}
        {attachments.length > 0 && (
          <div className="px-3.5 pt-3 pb-1 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="group relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-1.5 pr-7 flex items-center gap-2 text-xs"
              >
                {att.type === 'image' ? (
                  <img
                    src={att.content}
                    alt={att.name}
                    className="w-9 h-9 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0">
                    <FileCode2 className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium truncate max-w-[130px] text-black dark:text-white">
                    {att.name}
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    {formatBytes(att.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((x) => x.id !== att.id))
                  }
                  className="absolute right-1.5 top-1.5 p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-black dark:hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Active Voice Waveform Banner */}
        {isRecording && (
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-black dark:bg-white animate-ping" />
              <span className="text-xs font-medium text-black dark:text-white">
                Listening... Click stop to transcribe via Groq Whisper
              </span>
            </div>
            <div className="flex items-center gap-1 h-5">
              {audioBars.map((val, i) => (
                <span
                  key={i}
                  style={{ height: `${Math.max(20, val)}%` }}
                  className="w-1 rounded-full bg-black dark:bg-white transition-all duration-75"
                />
              ))}
            </div>
          </div>
        )}

        {/* Textarea */}
        <div className="px-4 pt-3.5 pb-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              isTranscribing
                ? 'Transcribing voice with Groq Whisper LPU...'
                : 'Ask anything, paste screenshots, or type / for commands...'
            }
            className="w-full bg-transparent text-[14px] leading-relaxed text-black dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none resize-none max-h-48"
          />
        </div>

        {/* Bottom Controls Bar */}
        <div className="px-3 pb-2.5 pt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.txt,.md,.json,.csv,.ts,.tsx,.js,.jsx,.py,.html,.css,.sql,.yaml,.yml,.xml,.rs,.go"
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleFiles(e.target.files);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />

            {/* Attach Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach Images (Vision) or Code/Text Files"
              className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Groq Model Selector */}
            <ModelSwitcher
              models={models}
              selectedModelId={selectedModelId}
              onSelectModel={onSelectModel}
              onRefreshModels={onRefreshModels}
              placement="top"
              compact
            />

            {/* Persona Selector Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setPersonaMenuOpen((o) => !o)}
                className="h-7 px-2.5 rounded-full border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white bg-neutral-50 dark:bg-neutral-900 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                <span className="hidden sm:inline max-w-[115px] truncate">
                  {activePersona?.name}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              <AnimatePresence>
                {personaMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.14 }}
                    className="absolute left-0 bottom-9 w-64 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl p-1.5 z-40"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                      Active Persona
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-0.5">
                      {personas.map((p) => {
                        const active = p.id === selectedPersonaId;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              onSelectPersona(p.id);
                              setPersonaMenuOpen(false);
                            }}
                            className={cn(
                              'w-full text-left px-2.5 py-2 rounded-xl transition-colors flex items-center justify-between',
                              active
                                ? 'bg-black text-white dark:bg-white dark:text-black'
                                : 'hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200'
                            )}
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">
                                {p.name}
                              </p>
                              <p
                                className={cn(
                                  'text-[10px] truncate',
                                  active
                                    ? 'text-white/75 dark:text-black/75'
                                    : 'text-neutral-500'
                                )}
                              >
                                {p.tagline}
                              </p>
                            </div>
                            {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Voice Mic + Send / Stop */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleVoiceRecording}
              disabled={isTranscribing}
              title={
                isRecording
                  ? 'Stop & Transcribe (Groq Whisper)'
                  : 'Voice Input (Groq Whisper LPU)'
              }
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                isRecording
                  ? 'bg-black text-white dark:bg-white dark:text-black scale-105'
                  : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
              )}
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {isStreaming ? (
              <motion.button
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={onStop}
                title="Stop Generating"
                className="h-8 w-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-sm"
              >
                <Square className="w-3 h-3 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={handleSubmit}
                disabled={!text.trim() && attachments.length === 0}
                title="Send Message (Enter)"
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                  text.trim() || attachments.length > 0
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm hover:scale-105'
                    : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                )}
              >
                <ArrowUp className="w-4 h-4 stroke-[2.2]" />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Subtle Desktop Footer Hint */}
      <div className="mt-1.5 px-2 flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-600 select-none">
        <span>
          Type <kbd className="font-mono">/</kbd> for prompts • Paste images for Vision
        </span>
        <span className="font-mono hidden sm:inline">
          {activeModel?.id.split('/').pop()} • {activeModel?.speedLabel}
        </span>
      </div>
    </div>
  );
};
