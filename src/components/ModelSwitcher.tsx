import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Brain,
  Check,
  ChevronDown,
  Eye,
  RefreshCw,
  Search,
  Zap,
} from 'lucide-react';
import { GroqModelInfo } from '../types';
import { cn } from '../utils/helpers';

type FilterTab = 'all' | 'fast' | 'reasoning' | 'vision';

interface ModelSwitcherProps {
  models: GroqModelInfo[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  onRefreshModels?: () => Promise<void> | void;
  placement?: 'bottom' | 'top';
}

export const ModelSwitcher: React.FC<ModelSwitcherProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  onRefreshModels,
  placement = 'bottom',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeModel = useMemo(
    () => models.find((m) => m.id === selectedModelId) || models[0],
    [models, selectedModelId]
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filteredModels = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter((m) => {
      if (filter === 'vision' && !m.supportsVision) return false;
      if (filter === 'reasoning' && !m.supportsReasoning) return false;
      if (filter === 'fast') {
        const lower = m.id.toLowerCase();
        const isFast =
          lower.includes('instant') ||
          lower.includes('8b') ||
          lower.includes('20b') ||
          lower.includes('scout') ||
          lower.includes('mini');
        if (!isFast) return false;
      }
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
      );
    });
  }, [models, query, filter]);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRefreshModels || refreshing) return;
    setRefreshing(true);
    try {
      await onRefreshModels();
    } finally {
      setRefreshing(false);
    }
  };

  const tabs: Array<{ id: FilterTab; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'fast', label: 'Fast' },
    { id: 'reasoning', label: 'Reasoning' },
    { id: 'vision', label: 'Vision' },
  ];

  return (
    <div ref={containerRef} className="app-no-drag relative">
      {/* Ultra-Clean Borderless Trigger (ChatGPT / Linear style) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Switch Groq AI Model"
        className={cn(
          'h-8 px-2.5 rounded-lg text-[13px] font-semibold tracking-tight flex items-center gap-1.5 transition-colors',
          open
            ? 'bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white'
            : 'text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
        )}
      >
        <span className="max-w-[180px] sm:max-w-[230px] truncate">
          {activeModel?.name || selectedModelId}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-neutral-400 transition-transform duration-150',
            open && 'rotate-180 text-black dark:text-white'
          )}
        />
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              y: placement === 'bottom' ? -4 : 4,
              scale: 0.98,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: placement === 'bottom' ? -4 : 4,
              scale: 0.98,
            }}
            transition={{ duration: 0.14 }}
            className={cn(
              'w-[330px] sm:w-[360px] rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-[#0C0C0C] shadow-2xl p-2 z-50',
              placement === 'bottom'
                ? 'absolute left-0 top-full mt-1.5'
                : 'absolute left-0 bottom-full mb-1.5'
            )}
          >
            {/* Search & Sync Bar */}
            <div className="flex items-center gap-1.5 mb-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search models..."
                  className="w-full h-8 pl-8 pr-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/80 border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 text-xs text-black dark:text-white outline-none transition-colors"
                />
              </div>

              {onRefreshModels && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  title="Refresh Live Groq Models"
                  className="h-8 w-8 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white transition-colors shrink-0"
                >
                  <RefreshCw
                    className={cn(
                      'w-3.5 h-3.5',
                      refreshing && 'animate-spin'
                    )}
                  />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 mb-1.5 px-0.5">
              {tabs.map((t) => {
                const active = filter === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFilter(t.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors',
                      active
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Model List */}
            <div className="max-h-72 overflow-y-auto space-y-0.5 pr-0.5 pt-1 border-t border-neutral-100 dark:border-neutral-900">
              {filteredModels.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No models found.
                </div>
              ) : (
                filteredModels.map((model) => {
                  const selected = model.id === selectedModelId;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        onSelectModel(model.id);
                        setOpen(false);
                        setQuery('');
                      }}
                      className={cn(
                        'w-full text-left px-2.5 py-2 rounded-xl transition-colors flex items-center justify-between gap-2',
                        selected
                          ? 'bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white'
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/60 text-neutral-700 dark:text-neutral-300'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium truncate text-black dark:text-white">
                            {model.name}
                          </span>
                          {model.supportsVision && (
                            <Eye className="w-3 h-3 text-neutral-400 shrink-0" />
                          )}
                          {model.supportsReasoning && (
                            <Brain className="w-3 h-3 text-neutral-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
                          {model.provider} • {model.speedLabel}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {selected ? (
                          <Check className="w-3.5 h-3.5 text-black dark:text-white" />
                        ) : (
                          <Zap className="w-3 h-3 text-neutral-300 dark:text-neutral-700" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
