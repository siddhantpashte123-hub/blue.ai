import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Code2,
  Cpu,
  KeyRound,
  Layers,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { STARTER_CARDS } from '../constants/presets';
import { validateAndFetchGroqModels } from '../services/groq';
import {
  Attachment,
  GroqModelInfo,
  Persona,
  PromptTemplate,
} from '../types';
import { openExternalUrl } from '../utils/helpers';
import { Composer } from './Composer';
import { MonochromeOrb } from './MonochromeOrb';

interface WelcomeScreenProps {
  hasApiKey: boolean;
  onSaveApiKey: (key: string, syncedModels?: GroqModelInfo[]) => void;
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  sendOnEnter: boolean;
  apiKey: string;
  personas: Persona[];
  selectedPersonaId: string;
  onSelectPersona: (id: string) => void;
  prompts: PromptTemplate[];
  externalDraft?: string | null;
  onConsumeExternalDraft?: () => void;
  onPickPrompt: (promptText: string, forceDemo?: boolean) => void;
}

const CHIP_ICONS = [Layers, Cpu, Sparkles, Code2];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  hasApiKey,
  onSaveApiKey,
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
  onPickPrompt,
}) => {
  const [quickKey, setQuickKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const handleQuickConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickKey.trim();
    if (!trimmed) return;
    setVerifying(true);
    setKeyError(null);
    const res = await validateAndFetchGroqModels(trimmed);
    setVerifying(false);
    if (res.valid) {
      onSaveApiKey(trimmed, res.models);
      setQuickKey('');
    } else {
      setKeyError(res.error || 'Invalid Groq API Key');
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-4 pb-10">
      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* Minimal Kinetic Core */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mb-5"
        >
          <MonochromeOrb size="md" state="idle" />
        </motion.div>

        {/* Single Clean Greeting */}
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.04 }}
          className="text-2xl sm:text-[28px] font-semibold tracking-tight text-black dark:text-white text-center mb-7"
        >
          What can I help with?
        </motion.h1>

        {/* Compact Onboarding Bar (shown ONLY if no API key is configured yet) */}
        {!hasApiKey && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-4 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950 space-y-2"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-black dark:text-white flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Connect Groq API Key</span>
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onPickPrompt(STARTER_CARDS[0].prompt, true)}
                  className="text-[11px] text-neutral-500 hover:text-black dark:hover:text-white"
                >
                  Try Demo
                </button>
                <button
                  type="button"
                  onClick={() => openExternalUrl('https://console.groq.com/keys')}
                  className="text-[11px] underline underline-offset-4 text-black dark:text-white hover:opacity-70"
                >
                  Get free key →
                </button>
              </div>
            </div>

            <form onSubmit={handleQuickConnect} className="flex items-center gap-2">
              <input
                type="password"
                value={quickKey}
                onChange={(e) => setQuickKey(e.target.value)}
                placeholder="Paste gsk_... key"
                className="flex-1 h-8 px-3 rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 font-mono text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white"
              />
              <button
                type="submit"
                disabled={!quickKey.trim() || verifying}
                className="h-8 px-3.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-medium flex items-center gap-1.5 disabled:opacity-40 shrink-0"
              >
                {verifying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Save</span>
              </button>
            </form>

            {keyError && (
              <p className="text-[11px] text-neutral-500">{keyError}</p>
            )}
          </motion.div>
        )}

        {/* Centered Main Composer */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.08 }}
          className="w-full"
        >
          <Composer
            onSend={onSend}
            onStop={onStop}
            isStreaming={isStreaming}
            sendOnEnter={sendOnEnter}
            apiKey={apiKey}
            personas={personas}
            selectedPersonaId={selectedPersonaId}
            onSelectPersona={onSelectPersona}
            prompts={prompts}
            externalDraft={externalDraft}
            onConsumeExternalDraft={onConsumeExternalDraft}
            centeredMode
          />
        </motion.div>

        {/* Subtle Minimal Quick Chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.14 }}
          className="mt-4 flex flex-wrap items-center justify-center gap-2"
        >
          {STARTER_CARDS.map((card, i) => {
            const Icon = CHIP_ICONS[i % CHIP_ICONS.length];
            return (
              <button
                key={card.title}
                type="button"
                onClick={() => onPickPrompt(card.prompt)}
                className="h-8 px-3.5 rounded-full border border-neutral-200/80 dark:border-neutral-800/80 hover:border-neutral-400 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-900/70 text-xs text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-all"
              >
                <Icon className="w-3.5 h-3.5 opacity-70" />
                <span>{card.title}</span>
              </button>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};
