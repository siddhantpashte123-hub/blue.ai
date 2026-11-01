import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Download,
  KeyRound,
  Maximize2,
  Minimize2,
  Moon,
  PanelLeft,
  Pin,
  Search,
  SlidersHorizontal,
  Square,
  Sun,
  X,
} from 'lucide-react';
import { GroqModelInfo, ThemeMode } from '../types';
import { cn } from '../utils/helpers';
import { ModelSwitcher } from './ModelSwitcher';

interface TitleBarProps {
  theme: ThemeMode;
  onToggleTheme: (mode: ThemeMode) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  onOpenCommandPalette: () => void;
  onOpenSettings: () => void;
  hasApiKey: boolean;
  isStreaming: boolean;
  models: GroqModelInfo[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  onRefreshModels: () => Promise<void> | void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  theme,
  onToggleTheme,
  sidebarOpen,
  onToggleSidebar,
  inspectorOpen,
  onToggleInspector,
  onOpenCommandPalette,
  onOpenSettings,
  hasApiKey,
  isStreaming,
  models,
  selectedModelId,
  onSelectModel,
  onRefreshModels,
}) => {
  const isElectron = Boolean(window.blueDesktop?.isElectron);
  const isNativeDesktop = isElectron || Boolean(window.isStandaloneExe);
  const [isMaximized, setIsMaximized] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);

  useEffect(() => {
    if (!window.blueDesktop?.isElectron) return;
    window.blueDesktop.getWindowState().then((st) => {
      setIsMaximized(st.isMaximized);
      setAlwaysOnTop(st.isAlwaysOnTop);
    });
    return window.blueDesktop.onMaximizedChanged((val) => {
      setIsMaximized(val);
    });
  }, []);

  const handleTogglePin = async () => {
    if (window.blueDesktop?.setAlwaysOnTop) {
      const next = await window.blueDesktop.setAlwaysOnTop(!alwaysOnTop);
      setAlwaysOnTop(next);
    }
  };

  return (
    <header className="app-drag-region h-12 shrink-0 bg-white/85 dark:bg-black/85 backdrop-blur-md flex items-center justify-between px-3 z-30">
      {/* Left: Sidebar Toggle + Clean Model Dropdown */}
      <div className="flex items-center gap-1 min-w-0">
        {!sidebarOpen && (
          <button
            type="button"
            onClick={onToggleSidebar}
            title="Open Sidebar (Ctrl+B)"
            className="app-no-drag w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        <ModelSwitcher
          models={models}
          selectedModelId={selectedModelId}
          onSelectModel={onSelectModel}
          onRefreshModels={onRefreshModels}
          placement="bottom"
        />
      </div>

      {/* Right: Minimalist Ghost Action Icons */}
      <div className="app-no-drag flex items-center gap-1 shrink-0">
        {!isNativeDesktop && (
          <a
            href="./blue.ai.exe"
            download="blue.ai.exe"
            title="Download Windows Desktop App (.exe)"
            className="h-7 px-2.5 mr-1 rounded-full bg-black text-white dark:bg-white dark:text-black text-[11px] font-medium flex items-center gap-1.5 hover:opacity-85 transition-opacity"
          >
            <Download className="w-3 h-3" />
            <span>.exe</span>
          </a>
        )}

        {!hasApiKey ? (
          <button
            type="button"
            onClick={onOpenSettings}
            className="h-7 px-3 mr-1 rounded-full bg-black text-white dark:bg-white dark:text-black text-[11px] font-medium flex items-center gap-1.5 hover:opacity-85 transition-opacity"
          >
            <KeyRound className="w-3 h-3" />
            <span>Add Groq Key</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenSettings}
            title="Groq Connected — Settings (Ctrl+,)"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors relative"
          >
            <KeyRound className="w-4 h-4" />
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full bg-black dark:bg-white absolute top-2 right-2',
                isStreaming && 'animate-ping'
              )}
            />
          </button>
        )}

        {/* Command Palette Search Icon */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          title="Command Palette (Ctrl+K)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Animated Single-Icon White / Black Theme Toggle */}
        <button
          type="button"
          onClick={() => onToggleTheme(theme === 'light' ? 'dark' : 'light')}
          title={
            theme === 'light'
              ? 'Switch to Pure Black Mode (Ctrl+Shift+L)'
              : 'Switch to Pure White Mode (Ctrl+Shift+L)'
          }
          className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
        >
          <AnimatePresence mode="wait" initial={false}>
            {theme === 'light' ? (
              <motion.span
                key="sun"
                initial={{ rotate: -60, opacity: 0, scale: 0.7 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 60, opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.16 }}
              >
                <Moon className="w-4 h-4" />
              </motion.span>
            ) : (
              <motion.span
                key="moon"
                initial={{ rotate: 60, opacity: 0, scale: 0.7 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: -60, opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.16 }}
              >
                <Sun className="w-4 h-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Parameter Inspector Toggle */}
        <button
          type="button"
          onClick={onToggleInspector}
          title="Parameters & System Prompt (Ctrl+.)"
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            inspectorOpen
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        {isElectron && (
          <>
            <button
              type="button"
              onClick={handleTogglePin}
              title={alwaysOnTop ? 'Unpin Window' : 'Pin Always-on-Top'}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                alwaysOnTop
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
              )}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center pl-1 ml-0.5 border-l border-neutral-200 dark:border-neutral-800 gap-0.5">
              <button
                type="button"
                onClick={() => window.blueDesktop?.minimize()}
                className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-500 hover:text-black dark:hover:text-white"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => window.blueDesktop?.maximize()}
                className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-500 hover:text-black dark:hover:text-white"
              >
                {isMaximized ? (
                  <Square className="w-3 h-3" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => window.blueDesktop?.close()}
                className="p-1.5 rounded hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-neutral-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
