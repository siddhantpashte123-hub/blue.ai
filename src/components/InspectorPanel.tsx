import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { GroqModelInfo, ModelParameters, Persona } from '../types';

interface InspectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  params: ModelParameters;
  onChangeParams: (next: ModelParameters) => void;
  activeModel?: GroqModelInfo;
  activePersona?: Persona;
  estimatedContextChars: number;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  isOpen,
  onClose,
  params,
  onChangeParams,
  activeModel,
  activePersona,
  estimatedContextChars,
}) => {
  const estTokens = Math.ceil(estimatedContextChars / 4);
  const maxCtx = activeModel?.contextWindow || 131072;
  const pct = Math.min(100, Math.round((estTokens / maxCtx) * 100));

  const resetDefaults = () => {
    onChangeParams({
      temperature: activePersona?.temperature ?? 0.6,
      maxTokens: 4096,
      topP: 0.95,
      stream: true,
      customSystemSuffix: '',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          key="inspector"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 292, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="h-full shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-950 flex flex-col overflow-hidden"
        >
          <div className="w-[292px] h-full flex flex-col">
            {/* Header */}
            <div className="h-12 px-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-black dark:text-white">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>LPU Inspector</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={resetDefaults}
                  title="Reset Defaults"
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
              {/* Context Meter */}
              <div className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-black dark:text-white">
                    Context Window
                  </span>
                  <span className="font-mono text-[11px] text-neutral-500">
                    ~{estTokens.toLocaleString()} / {(maxCtx / 1024).toFixed(0)}K
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                  <div
                    style={{ width: `${Math.max(2, pct)}%` }}
                    className="h-full bg-black dark:bg-white rounded-full transition-all"
                  />
                </div>
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-black dark:text-white">
                    Temperature
                  </label>
                  <span className="font-mono text-neutral-500">
                    {params.temperature.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={params.temperature}
                  onChange={(e) =>
                    onChangeParams({
                      ...params,
                      temperature: parseFloat(e.target.value),
                    })
                  }
                  className="w-full mono-slider"
                />
                <div className="flex justify-between text-[10px] text-neutral-400">
                  <span>Precise (0.0)</span>
                  <span>Creative (1.5)</span>
                </div>
              </div>

              {/* Max Completion Tokens */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-black dark:text-white">
                    Max Output Tokens
                  </label>
                  <span className="font-mono text-neutral-500">
                    {params.maxTokens}
                  </span>
                </div>
                <input
                  type="range"
                  min={256}
                  max={8192}
                  step={256}
                  value={params.maxTokens}
                  onChange={(e) =>
                    onChangeParams({
                      ...params,
                      maxTokens: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full mono-slider"
                />
              </div>

              {/* Top-P */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-black dark:text-white">
                    Top-P Sampling
                  </label>
                  <span className="font-mono text-neutral-500">
                    {params.topP.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={params.topP}
                  onChange={(e) =>
                    onChangeParams({
                      ...params,
                      topP: parseFloat(e.target.value),
                    })
                  }
                  className="w-full mono-slider"
                />
              </div>

              {/* Stream Toggle */}
              <div className="flex items-center justify-between py-2 border-y border-neutral-200 dark:border-neutral-800">
                <div>
                  <p className="font-medium text-black dark:text-white">
                    Real-Time Token Stream
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Stream SSE chunks live
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChangeParams({ ...params, stream: !params.stream })
                  }
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                    params.stream
                      ? 'bg-black dark:bg-white'
                      : 'bg-neutral-300 dark:bg-neutral-800'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full transition-transform ${
                      params.stream
                        ? 'translate-x-5 bg-white dark:bg-black'
                        : 'translate-x-0 bg-white dark:bg-neutral-400'
                    }`}
                  />
                </button>
              </div>

              {/* Active Persona Base Prompt Preview */}
              {activePersona && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-black dark:text-white">
                      Persona Base ({activePersona.name})
                    </span>
                  </div>
                  <p className="p-2.5 rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 leading-relaxed">
                    {activePersona.systemPrompt}
                  </p>
                </div>
              )}

              {/* Custom System Instructions Suffix */}
              <div className="space-y-1.5">
                <label className="font-medium text-black dark:text-white block">
                  Custom Instructions
                </label>
                <textarea
                  rows={4}
                  value={params.customSystemSuffix}
                  onChange={(e) =>
                    onChangeParams({
                      ...params,
                      customSystemSuffix: e.target.value,
                    })
                  }
                  placeholder="e.g. Always reply in Hinglish, prefer TypeScript..."
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 focus:border-black dark:focus:border-white text-xs text-black dark:text-white outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
