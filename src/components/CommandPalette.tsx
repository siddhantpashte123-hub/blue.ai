import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  BookMarked,
  Cpu,
  Download,
  KeyRound,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
} from 'lucide-react';
import {
  Conversation,
  GroqModelInfo,
  Persona,
  ThemeMode,
} from '../types';
import { cn } from '../utils/helpers';

interface CommandItem {
  id: string;
  group: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  onRun: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onToggleTheme: (mode: ThemeMode) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onOpenPrompts: () => void;
  onOpenPersonas: () => void;
  onOpenAnalytics: () => void;
  onExportCurrent: () => void;
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  models: GroqModelInfo[];
  onSelectModel: (id: string) => void;
  personas: Persona[];
  onSelectPersona: (id: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  onNewChat,
  onOpenSettings,
  onOpenPrompts,
  onOpenPersonas,
  onOpenAnalytics,
  onExportCurrent,
  conversations,
  onSelectConversation,
  models,
  onSelectModel,
  personas,
  onSelectPersona,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  const allItems: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [
      {
        id: 'act-new',
        group: 'Actions',
        label: 'Start New Thread',
        sublabel: '⌘N',
        icon: <Plus className="w-4 h-4" />,
        onRun: onNewChat,
      },
      {
        id: 'act-theme',
        group: 'Actions',
        label:
          theme === 'light'
            ? 'Switch to Pure Black Mode'
            : 'Switch to Pure White Mode',
        sublabel: 'Theme',
        icon:
          theme === 'light' ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          ),
        onRun: () => onToggleTheme(theme === 'light' ? 'dark' : 'light'),
      },
      {
        id: 'act-key',
        group: 'Actions',
        label: 'Configure Groq API Key & Settings',
        sublabel: '⌘,',
        icon: <KeyRound className="w-4 h-4" />,
        onRun: onOpenSettings,
      },
      {
        id: 'act-prompts',
        group: 'Actions',
        label: 'Open Prompt Vault',
        sublabel: 'Slash Templates',
        icon: <BookMarked className="w-4 h-4" />,
        onRun: onOpenPrompts,
      },
      {
        id: 'act-personas',
        group: 'Actions',
        label: 'Manage AI Personas',
        sublabel: 'Spaces',
        icon: <Sparkles className="w-4 h-4" />,
        onRun: onOpenPersonas,
      },
      {
        id: 'act-stats',
        group: 'Actions',
        label: 'View Groq LPU Telemetry & Speed Stats',
        sublabel: 'Analytics',
        icon: <Activity className="w-4 h-4" />,
        onRun: onOpenAnalytics,
      },
      {
        id: 'act-export',
        group: 'Actions',
        label: 'Export Active Thread as Markdown',
        sublabel: '.md',
        icon: <Download className="w-4 h-4" />,
        onRun: onExportCurrent,
      },
    ];

    for (const m of models) {
      items.push({
        id: `model-${m.id}`,
        group: 'Groq Models',
        label: `Switch Model: ${m.name}`,
        sublabel: m.speedLabel,
        icon: <Cpu className="w-4 h-4" />,
        onRun: () => onSelectModel(m.id),
      });
    }

    for (const p of personas) {
      items.push({
        id: `persona-${p.id}`,
        group: 'Personas',
        label: `Activate Persona: ${p.name}`,
        sublabel: p.tagline,
        icon: <Sparkles className="w-4 h-4" />,
        onRun: () => onSelectPersona(p.id),
      });
    }

    for (const c of conversations.slice(0, 15)) {
      items.push({
        id: `conv-${c.id}`,
        group: 'Threads',
        label: c.title,
        sublabel: `${c.messages.length} msgs`,
        icon: <MessageSquare className="w-4 h-4" />,
        onRun: () => onSelectConversation(c.id),
      });
    }

    return items;
  }, [
    theme,
    onNewChat,
    onToggleTheme,
    onOpenSettings,
    onOpenPrompts,
    onOpenPersonas,
    onOpenAnalytics,
    onExportCurrent,
    models,
    onSelectModel,
    personas,
    onSelectPersona,
    conversations,
    onSelectConversation,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 18);
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        (item.sublabel && item.sublabel.toLowerCase().includes(q))
    );
  }, [allItems, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [filtered.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filtered.length > 0) {
          setActiveIndex((i) => (i + 1) % filtered.length);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filtered.length > 0) {
          setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const chosen = filtered[activeIndex];
        if (chosen) {
          onClose();
          chosen.onRun();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, filtered, activeIndex, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/45 dark:bg-black/75 backdrop-blur-sm flex items-start justify-center pt-[13vh] px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'spring', stiffness: 440, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl overflow-hidden"
          >
            {/* Search Input */}
            <div className="px-4 h-12 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command, Groq model, persona, or thread..."
                className="w-full bg-transparent text-sm text-black dark:text-white placeholder:text-neutral-400 outline-none"
              />
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 text-neutral-400">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-xs text-neutral-400">
                  No matching commands found.
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const selected = idx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        onClose();
                        item.onRun();
                      }}
                      className={cn(
                        'w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-left transition-colors',
                        selected
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0 opacity-80">{item.icon}</span>
                        <span className="text-xs font-medium truncate">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.sublabel && (
                          <span className="text-[10px] font-mono opacity-65 truncate max-w-[140px]">
                            {item.sublabel}
                          </span>
                        )}
                        <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-current opacity-45">
                          {item.group}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
