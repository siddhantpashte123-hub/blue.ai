import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Check,
  Download,
  KeyRound,
  Loader2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { STARTER_CARDS } from '../constants/presets';
import { validateAndFetchGroqModels } from '../services/groq';
import { GroqModelInfo, Persona } from '../types';
import { cn, openExternalUrl } from '../utils/helpers';
import { MonochromeOrb } from './MonochromeOrb';

interface WelcomeScreenProps {
  hasApiKey: boolean;
  onSaveApiKey: (key: string, syncedModels?: GroqModelInfo[]) => void;
  models: GroqModelInfo[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  personas: Persona[];
  selectedPersonaId: string;
  onSelectPersona: (id: string) => void;
  onPickPrompt: (promptText: string, forceDemo?: boolean) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  hasApiKey,
  onSaveApiKey,
  models,
  selectedModelId,
  onSelectModel,
  personas,
  selectedPersonaId,
  onSelectPersona,
  onPickPrompt,
}) => {
  const [quickKey, setQuickKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const isNativeDesktop =
    Boolean(window.blueDesktop?.isElectron) || Boolean(window.isStandaloneExe);

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
    <div className="w-full max-w-3xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center min-h-full">
      {/* Kinetic Monochrome Core */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mb-5"
      >
        <MonochromeOrb size="lg" state="idle" />
      </motion.div>

      {/* Editorial Heading */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.06 }}
        className="text-center space-y-2 mb-6"
      >
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-800 text-[10px] font-mono uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
          <Zap className="w-3 h-3 text-black dark:text-white" />
          <span>blue.ai • Groq LPU Studio</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-black dark:text-white">
          Pure clarity. Instant intelligence.
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
          Ultra-clean monochrome desktop studio with sub-second Groq LPU streaming, Vision, Whisper voice, and Live Artifact Canvas.
        </p>

        {!isNativeDesktop && (
          <div className="pt-2">
            <a
              href="./blue.ai.exe"
              download="blue.ai.exe"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Windows Desktop App (blue.ai.exe)</span>
            </a>
          </div>
        )}
      </motion.div>

      {/* Quick Inline Groq Key Onboarding Card (only shown when no API key is set yet) */}
      {!hasApiKey && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
          className="w-full max-w-lg mb-7 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-950 space-y-2.5"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-black dark:text-white flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Connect your Groq API Key</span>
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  onPickPrompt(STARTER_CARDS[0].prompt, true)
                }
                className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Try Live Demo</span>
              </button>
              <button
                type="button"
                onClick={() => openExternalUrl('https://console.groq.com/keys')}
                className="text-[11px] font-mono underline underline-offset-4 text-black dark:text-white hover:opacity-70"
              >
                Get Key →
              </button>
            </div>
          </div>

          <form onSubmit={handleQuickConnect} className="flex items-center gap-2">
            <input
              type="password"
              value={quickKey}
              onChange={(e) => setQuickKey(e.target.value)}
              placeholder="Paste gsk_... key here for instant LPU streaming"
              className="flex-1 h-9 px-3 rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 focus:border-black dark:focus:border-white font-mono text-xs text-black dark:text-white outline-none"
            />
            <button
              type="submit"
              disabled={!quickKey.trim() || verifying}
              className="h-9 px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-medium flex items-center gap-1.5 disabled:opacity-40 transition-opacity shrink-0"
            >
              {verifying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Connect</span>
            </button>
          </form>

          {keyError && (
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
              {keyError}
            </p>
          )}
        </motion.div>
      )}

      {/* Quick Groq Model Sliding Pill Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.12 }}
        className="w-full flex flex-col items-center gap-1.5 mb-4"
      >
        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
          Select Groq Model
        </span>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {models.slice(0, 6).map((m) => {
            const active = m.id === selectedModelId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectModel(m.id)}
                className={cn(
                  'relative px-3 py-1.5 rounded-full text-xs font-medium transition-colors z-10 flex items-center gap-1.5',
                  active
                    ? 'text-white dark:text-black'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/70'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="hero-model-pill"
                    transition={{ type: 'spring', stiffness: 440, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-black dark:bg-white -z-10"
                  />
                )}
                <span>{m.name}</span>
                <span className="text-[10px] font-mono opacity-65">
                  {m.speedLabel}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Persona Sliding Pill Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.14 }}
        className="flex flex-wrap items-center justify-center gap-1.5 mb-6"
      >
        {personas.slice(0, 5).map((p) => {
          const active = p.id === selectedPersonaId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPersona(p.id)}
              className={cn(
                'relative px-3 py-1.5 rounded-full text-xs font-medium transition-colors z-10',
                active
                  ? 'text-white dark:text-black'
                  : 'text-neutral-500 hover:text-black dark:hover:text-white border border-neutral-200 dark:border-neutral-800'
              )}
            >
              {active && (
                <motion.span
                  layoutId="hero-persona-pill"
                  transition={{ type: 'spring', stiffness: 440, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-black dark:bg-white -z-10"
                />
              )}
              {p.name}
            </button>
          );
        })}
      </motion.div>

      {/* Starter Prompt Grid */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {STARTER_CARDS.map((card, i) => (
          <motion.button
            key={card.title}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: 0.16 + i * 0.05 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onPickPrompt(card.prompt)}
            className="group text-left p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white bg-white dark:bg-[#090909] transition-colors flex flex-col justify-between gap-2.5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                {card.badge}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-black dark:text-white">
                {card.title}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                {card.subtitle}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
