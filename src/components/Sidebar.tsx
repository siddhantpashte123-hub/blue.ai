import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  BookMarked,
  Check,
  Download,
  Edit3,
  PanelLeftClose,
  Pin,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Conversation } from '../types';
import { cn } from '../utils/helpers';

interface SidebarProps {
  isOpen: boolean;
  onCloseSidebar: () => void;
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
  onCloseSidebar,
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.14 }}
        onClick={() => !isEditing && onSelect(conv.id)}
        className={cn(
          'group relative h-9 rounded-xl px-2.5 flex items-center justify-between cursor-pointer transition-colors select-none',
          isActive
            ? 'bg-neutral-200/75 dark:bg-neutral-900 text-black dark:text-white font-medium'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900/60 hover:text-black dark:hover:text-white'
        )}
      >
        {isEditing ? (
          <div
            className="flex items-center gap-1 w-full"
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
              className="w-full bg-transparent text-xs font-medium text-black dark:text-white outline-none border-b border-current pb-0.5"
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
          <>
            <span className="text-[13px] truncate pr-1">{conv.title}</span>

            <div
              className={cn(
                'flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0',
                conv.pinned && !isActive && 'opacity-60'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onTogglePin(conv.id)}
                title={conv.pinned ? 'Unpin' : 'Pin'}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
              >
                <Pin className={cn('w-3 h-3', conv.pinned && 'fill-current')} />
              </button>
              <button
                type="button"
                onClick={(e) => startRename(conv, e)}
                title="Rename"
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onExport(conv)}
                title="Export .md"
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
              >
                <Download className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(conv.id)}
                title="Delete"
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </>
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
          animate={{ width: 248, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 36 }}
          className="h-full shrink-0 border-r border-neutral-100 dark:border-neutral-900 bg-[#FAFAFA] dark:bg-[#060606] flex flex-col overflow-hidden"
        >
          <div className="w-[248px] h-full flex flex-col">
            {/* Minimal Sidebar Header */}
            <div className="h-12 px-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 select-none pl-1">
                <span className="w-2 h-2 rounded-full bg-black dark:bg-white" />
                <span className="text-sm font-semibold tracking-tight text-black dark:text-white">
                  blue.ai
                </span>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={onNewChat}
                  title="New Thread (Ctrl+N)"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-900 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onCloseSidebar}
                  title="Close Sidebar (Ctrl+B)"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-900 transition-colors"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Subtle Filter Input */}
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full h-8 pl-8 pr-7 rounded-xl bg-neutral-200/50 dark:bg-neutral-900/80 text-xs text-black dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none focus:bg-neutral-200/80 dark:focus:bg-neutral-900 transition-colors"
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
            <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-3">
              {pinnedList.length > 0 && (
                <div className="space-y-0.5">
                  <div className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
                    Pinned
                  </div>
                  <AnimatePresence initial={false}>
                    {pinnedList.map(renderThreadRow)}
                  </AnimatePresence>
                </div>
              )}

              <div className="space-y-0.5">
                {conversations.length > 0 && (
                  <div className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
                    {query ? 'Results' : 'Recent'}
                  </div>
                )}
                {recentList.length === 0 && pinnedList.length === 0 ? (
                  <div className="px-2.5 py-8 text-center">
                    <p className="text-xs text-neutral-400 dark:text-neutral-600">
                      {query ? 'No matches' : 'No recent chats'}
                    </p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {recentList.map(renderThreadRow)}
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* Whisper-Clean Single-Row Icon Footer */}
            <div className="h-12 px-3 border-t border-neutral-200/60 dark:border-neutral-900 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onOpenPersonas}
                  title="AI Personas"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-900 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenPrompts}
                  title="Prompt Vault (/)"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-900 transition-colors"
                >
                  <BookMarked className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenAnalytics}
                  title="LPU Speed Telemetry"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-900 transition-colors"
                >
                  <Activity className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={onOpenSettings}
                title="Settings & API Key (Ctrl+,)"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-900 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
