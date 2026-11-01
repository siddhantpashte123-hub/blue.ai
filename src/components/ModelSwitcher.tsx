import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Brain,
  Check,
  ChevronDown,
  Cpu,
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
  compact?: boolean;
}

export const ModelSwitcher: React.FC<ModelSwitcherProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  onRefreshModels,
  placement = 'bottom',
  compact = false,
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

  // Close when clicking outside or pressing Escape
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
    { id: 'all', label: `All (${models.length})` },
    { id: 'fast', label: 'Fast' },
    { id: 'reasoning', label: 'Reasoning' },
    { id: 'vision', label: 'Vision' },
  ];

  return (
    <div ref={containerRef} className="app-no-drag relative">
      {/* Trigger Pill */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Switch Groq AI Model"
        className={cn(
          'rounded-full border transition-all flex items-center gap-1.5 font-medium',
          compact ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-xs',
          open
            ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
            : 'border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white'
        )}
      >
        <Cpu className="w-3.5 h-3.5 shrink-0 opacity-75" />
        {!compact && (
          <span className="hidden xl:inline text-[11px] opacity-55 font-normal">
            Model:
          </span>
        )}
        <span className="max-w-[130px] sm:max-w-[185px] truncate font-semibold">
          {activeModel?.name || selectedModelId}
        </span>
        {!compact && activeModel?.speedLabel && (
          <span
            className={cn(
              'hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono',
              open
                ? 'bg-white/20 text-white dark:bg-black/15 dark:text-black'
                : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
            )}
          >
            <Zap className="w-2.5 h-2.5" />
            {activeModel.speedLabel}
          </span>
        )}
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 opacity-65 transition-transform duration-150',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              y: placement === 'bottom' ? -6 : 6,
              scale: 0.97,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: placement === 'bottom' ? -6 : 6,
              scale: 0.97,
            }}
            transition={{ duration: 0.15 }}
            className={cn(
              'w-[340px] sm:w-[375px] rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl p-2.5 z-50',
              placement === 'bottom'
                ? 'absolute left-0 top-full mt-2'
                : 'absolute left-0 bottom-full mb-2'
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
                  placeholder="Search Groq LPU models..."
                  className="w-full h-8 pl-8 pr-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-black dark:text-white outline-none focus:border-black dark:focus:border-white"
                />
              </div>

              {onRefreshModels && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  title="Sync Live Models from Groq API"
                  className="h-8 w-8 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors shrink-0"
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
            <div className="flex items-center gap-1 mb-2 pb-2 border-b border-neutral-100 dark:border-neutral-900">
              {tabs.map((t) => {
                const active = filter === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFilter(t.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
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

            {/* Model Rows */}
            <div className="max-h-72 overflow-y-auto space-y-1 pr-0.5">
              {filteredModels.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No models match this filter.
                </div>
              ) : (
                filteredModels.map((model) => {
                  const selected = model.id === selectedModelId;
                  const ctxK = Math.round((model.contextWindow || 131072) / 1024);
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
                        'w-full text-left p-2.5 rounded-xl transition-colors flex items-start justify-between gap-2',
                        selected
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold truncate">
                            {model.name}
                          </span>
                          {model.supportsVision && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono uppercase border border-current opacity-80">
                              <Eye className="w-2.5 h-2.5 mr-0.5" />
                              Vision
                            </span>
                          )}
                          {model.supportsReasoning && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono uppercase border border-current opacity-80">
                              <Brain className="w-2.5 h-2.5 mr-0.5" />
                              Think
                            </span>
                          )}
                        </div>
                        <p
                          className={cn(
                            'text-[11px] line-clamp-1 mt-0.5',
                            selected
                              ? 'text-white/75 dark:text-black/75'
                              : 'text-neutral-500'
                          )}
                        >
                          {model.description}
                        </p>
                        <p
                          className={cn(
                            'text-[10px] font-mono mt-1',
                            selected
                              ? 'text-white/60 dark:text-black/60'
                              : 'text-neutral-400'
                          )}
                        >
                          {model.provider} • {ctxK}K ctx
                        </p>
                      </div>

                      <div className="flex flex-col items-end shrink-0 gap-1.5">
                        <span className="text-[10px] font-mono opacity-85 flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5" />
                          {model.speedLabel}
                        </span>
                        {selected && <Check className="w-3.5 h-3.5" />}
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
