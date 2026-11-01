import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  Check,
  ChevronDown,
  FileCode2,
  Loader2,
  Mic,
  Plus,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { Attachment, Persona, PromptTemplate } from '../types';
import { transcribeAudioWithGroq } from '../services/groq';
import { cn, formatBytes, processUploadedFile } from '../utils/helpers';

interface ComposerProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  sendOnEnter: boolean;
  apiKey: string;
  personas: Persona[];
  selectedPersonaId: string;
  onSelectPersona: (personaId: string) => void;
  prompts: PromptTemplate[];
  externalDraft?: string | null;
  onConsumeExternalDraft?: () => void;
  centeredMode?: boolean;
}

export const Composer: React.FC<ComposerProps> = ({
  onSend,
  onStop,
  isStreaming,
  sendOnEnter,
  apiKey,
  personas,
  selectedPersonaId,
  onSelectPersona,
  prompts,
  externalDraft,
  onConsumeExternalDraft,
  centeredMode = false,
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
  const personaRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const activePersona = useMemo(
    () => personas.find((p) => p.id === selectedPersonaId) || personas[0],
    [personas, selectedPersonaId]
  );

  // Close persona menu on outside click
  useEffect(() => {
    if (!personaMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (personaRef.current && !personaRef.current.contains(e.target as Node)) {
        setPersonaMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [personaMenuOpen]);

  useEffect(() => {
    if (externalDraft !== null && externalDraft !== undefined) {
      setText(externalDraft);
      onConsumeExternalDraft?.();
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 30);
    }
  }, [externalDraft, onConsumeExternalDraft]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [text]);

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
        // Fallback pulse
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
          setVoiceError('Add your Groq API key to use Whisper voice transcription.');
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
      setVoiceError('Microphone access unavailable.');
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
      className={cn(
        'relative w-full max-w-2xl mx-auto',
        centeredMode ? 'px-0' : 'px-4 pb-5 pt-2'
      )}
    >
      {/* Slash Command Popover */}
      <AnimatePresence>
        {slashMatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.13 }}
            className="absolute left-4 right-4 bottom-full mb-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D0D0D] shadow-2xl p-1.5 z-30"
          >
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
                    <span className="text-xs truncate opacity-80">
                      {tpl.title}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {voiceError && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
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

      {/* Clean Elevated Input Container */}
      <div
        className={cn(
          'rounded-[24px] border bg-neutral-50/90 dark:bg-[#0E0E0E] transition-all',
          isDragging
            ? 'border-black dark:border-white ring-2 ring-black/10 dark:ring-white/10'
            : 'border-neutral-200/90 dark:border-neutral-800/90 focus-within:border-neutral-400 dark:focus-within:border-neutral-600 focus-within:bg-white dark:focus-within:bg-[#111111] shadow-[0_2px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.45)]'
        )}
      >
        {/* Attachments Strip */}
        {attachments.length > 0 && (
          <div className="px-3.5 pt-3 pb-1 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-1.5 pr-7 flex items-center gap-2 text-xs"
              >
                {att.type === 'image' ? (
                  <img
                    src={att.content}
                    alt={att.name}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0">
                    <FileCode2 className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium truncate max-w-[130px] text-black dark:text-white">
                    {att.name}
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    {formatBytes(att.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((x) => x.id !== att.id))
                  }
                  className="absolute right-1.5 top-1.5 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-black dark:hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Active Voice Waveform */}
        {isRecording && (
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-black dark:bg-white animate-ping" />
              <span className="text-xs font-medium text-black dark:text-white">
                Listening...
              </span>
            </div>
            <div className="flex items-center gap-1 h-4">
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
        <div className="px-4 pt-3.5 pb-1.5">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              isTranscribing ? 'Transcribing voice...' : 'Message blue.ai...'
            }
            className="w-full bg-transparent text-[14.5px] leading-relaxed text-black dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none resize-none max-h-44"
          />
        </div>

        {/* Clean Minimal Bottom Action Row */}
        <div className="px-2.5 pb-2.5 pt-0.5 flex items-center justify-between">
          <div className="flex items-center gap-1">
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

            {/* Plus Attach Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach image or file"
              className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Subtle Ghost Persona Selector */}
            <div ref={personaRef} className="relative">
              <button
                type="button"
                onClick={() => setPersonaMenuOpen((o) => !o)}
                title="Switch AI Persona"
                className={cn(
                  'h-7 px-2.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors',
                  personaMenuOpen
                    ? 'bg-neutral-200/80 dark:bg-neutral-800 text-black dark:text-white'
                    : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800/70'
                )}
              >
                <Sparkles className="w-3 h-3" />
                <span>{activePersona?.name}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              <AnimatePresence>
                {personaMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.13 }}
                    className="absolute left-0 bottom-9 w-56 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D0D0D] shadow-2xl p-1.5 z-40"
                  >
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
                                ? 'bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white'
                                : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/60 text-neutral-700 dark:text-neutral-300'
                            )}
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">
                                {p.name}
                              </p>
                              <p className="text-[10px] text-neutral-400 truncate">
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

          {/* Right: Mic + Send / Stop */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleVoiceRecording}
              disabled={isTranscribing}
              title={isRecording ? 'Stop Recording' : 'Voice Input'}
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                isRecording
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800/80'
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
                className="h-8 w-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center"
              >
                <Square className="w-3 h-3 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={handleSubmit}
                disabled={!text.trim() && attachments.length === 0}
                title="Send"
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                  text.trim() || attachments.length > 0
                    ? 'bg-black text-white dark:bg-white dark:text-black hover:opacity-90'
                    : 'bg-neutral-200/70 dark:bg-neutral-800/70 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                )}
              >
                <ArrowUp className="w-4 h-4 stroke-[2.2]" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
