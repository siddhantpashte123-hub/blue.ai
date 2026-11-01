import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  BookMarked,
  Check,
  Download,
  Edit3,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Conversation } from '../types';
import { cn, formatRelativeTime } from '../utils/helpers';

interface SidebarProps {
  isOpen: boolean;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onExport: (conv: Conversation) => void;
  onOpenPrompts: () => void;
  onOpenPersonas: () => void;
  onOpenAnalytics: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onTogglePin,
  onRename,
  onExport,
  onOpenPrompts,
  onOpenPersonas,
  onOpenAnalytics,
  onOpenSettings,
}) => {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [conversations, query]);

  const pinnedList = useMemo(
    () => filtered.filter((c) => c.pinned),
    [filtered]
  );
  const recentList = useMemo(
    () => filtered.filter((c) => !c.pinned),
    [filtered]
  );

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditDraft(conv.title);
  };

  const commitRename = (id: string) => {
    if (editDraft.trim()) {
      onRename(id, editDraft.trim());
    }
    setEditingId(null);
  };

  const renderThreadRow = (conv: Conversation) => {
    const isActive = conv.id === activeId;
    const isEditing = editingId === conv.id;

    return (
      <motion.div
        key={conv.id}
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{ duration: 0.16 }}
        onClick={() => !isEditing && onSelect(conv.id)}
        className={cn(
          'group relative rounded-xl px-2.5 py-2 cursor-pointer transition-colors select-none',
          isActive
            ? 'bg-black text-white dark:bg-white dark:text-black'
            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900'
        )}
      >
        {isEditing ? (
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename(conv.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              className="w-full bg-transparent text-xs font-medium outline-none border-b border-current pb-0.5"
            />
            <button
              type="button"
              onClick={() => commitRename(conv.id)}
              className="p-0.5 opacity-80 hover:opacity-100"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="p-0.5 opacity-80 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <MessageSquare
                  className={cn(
                    'w-3.5 h-3.5 shrink-0',
                    isActive
                      ? 'text-white/80 dark:text-black/80'
                      : 'text-neutral-400 dark:text-neutral-500'
                  )}
                />
                <p className="text-xs font-medium truncate">{conv.title}</p>
              </div>
              <p
                className={cn(
                  'text-[10px] pl-5 mt-0.5 truncate',
                  isActive
                    ? 'text-white/65 dark:text-black/65'
                    : 'text-neutral-400 dark:text-neutral-500'
                )}
              >
                {conv.messages.length} msgs • {formatRelativeTime(conv.updatedAt)}
              </p>
            </div>

            {/* Thread Hover Actions */}
            <div
              className={cn(
                'flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0',
                isActive && 'opacity-100'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onTogglePin(conv.id)}
                title={conv.pinned ? 'Unpin' : 'Pin Thread'}
                className="p-1 rounded hover:bg-white/15 dark:hover:bg-black/15"
              >
                <Pin
                  className={cn(
                    'w-3 h-3',
                    conv.pinned && 'fill-current'
                  )}
                />
              </button>
              <button
                type="button"
                onClick={(e) => startRename(conv, e)}
                title="Rename"
                className="p-1 rounded hover:bg-white/15 dark:hover:bg-black/15"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onExport(conv)}
                title="Export Markdown"
                className="p-1 rounded hover:bg-white/15 dark:hover:bg-black/15"
              >
                <Download className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(conv.id)}
                title="Delete Thread"
                className="p-1 rounded hover:bg-white/15 dark:hover:bg-black/15"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.aside
          key="sidebar"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 268, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="h-full shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950/90 flex flex-col overflow-hidden"
        >
          <div className="w-[268px] h-full flex flex-col">
            {/* Top Action & Search */}
            <div className="p-3 space-y-2.5 border-b border-neutral-200/80 dark:border-neutral-800/80">
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onNewChat}
                className="w-full h-9 px-3 rounded-xl bg-black text-white dark:bg-white dark:text-black font-medium text-xs flex items-center justify-between hover:opacity-90 transition-opacity shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>New Thread</span>
                </span>
                <kbd className="font-mono text-[10px] opacity-70">⌘N</kbd>
              </motion.button>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter conversations..."
                  className="w-full h-8 pl-8 pr-7 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:border-black dark:focus:border-white text-xs text-black dark:text-white placeholder:text-neutral-400 outline-none transition-colors"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Thread List */}
            <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-4">
              {pinnedList.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 text-[10px] font-mono uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    Pinned
                  </div>
                  <AnimatePresence initial={false}>
                    {pinnedList.map(renderThreadRow)}
                  </AnimatePresence>
                </div>
              )}

              <div className="space-y-1">
                <div className="px-2 text-[10px] font-mono uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                  {query ? 'Search Results' : 'Threads'}
                </div>
                {recentList.length === 0 && pinnedList.length === 0 ? (
                  <div className="px-2.5 py-8 text-center">
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      {query
                        ? 'No matching threads found.'
                        : 'No threads yet. Start chatting below.'}
                    </p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {recentList.map(renderThreadRow)}
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* Bottom Studio Dock */}
            <div className="p-2.5 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-2 gap-1.5 bg-white/60 dark:bg-black/60">
              <button
                type="button"
                onClick={onOpenPersonas}
                className="h-8 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Personas</span>
              </button>
              <button
                type="button"
                onClick={onOpenPrompts}
                className="h-8 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <BookMarked className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Prompts</span>
              </button>
              <button
                type="button"
                onClick={onOpenAnalytics}
                className="h-8 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Telemetry</span>
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="h-8 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <Settings className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Settings</span>
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
