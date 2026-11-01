import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AppWindow,
  Command,
  KeyRound,
  Maximize2,
  Minimize2,
  Moon,
  PanelLeft,
  Pin,
  SlidersHorizontal,
  Square,
  Sun,
  X,
  Zap,
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
  framedPreview: boolean;
  onToggleFramedPreview: () => void;
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
  framedPreview,
  onToggleFramedPreview,
  models,
  selectedModelId,
  onSelectModel,
  onRefreshModels,
}) => {
  const isElectron = Boolean(window.blueDesktop?.isElectron);
  const [isMaximized, setIsMaximized] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);

  useEffect(() => {
    if (!window.blueDesktop) return;
    window.blueDesktop.getWindowState().then((st) => {
      setIsMaximized(st.isMaximized);
      setAlwaysOnTop(st.isAlwaysOnTop);
    });
    const unsubscribe = window.blueDesktop.onMaximizedChanged((val) => {
      setIsMaximized(val);
    });
    return unsubscribe;
  }, []);

  const handleTogglePin = async () => {
    if (window.blueDesktop?.setAlwaysOnTop) {
      const next = await window.blueDesktop.setAlwaysOnTop(!alwaysOnTop);
      setAlwaysOnTop(next);
    } else {
      setAlwaysOnTop((prev) => !prev);
    }
  };

  return (
    <header className="app-drag-region h-12 shrink-0 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-black/95 backdrop-blur-md flex items-center justify-between px-3 gap-2 z-30">
      {/* Left: Window Dots + Sidebar + Brand + Prominent Model Switcher */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="app-no-drag flex items-center gap-1.5 pr-0.5">
          <button
            type="button"
            onClick={() => {
              if (isElectron) window.blueDesktop?.close();
            }}
            title={isElectron ? 'Close Window' : 'Desktop Window Chrome'}
            className="w-2.5 h-2.5 rounded-full border border-neutral-400 dark:border-neutral-600 bg-neutral-900 dark:bg-neutral-100 hover:scale-110 transition-transform"
          />
          <button
            type="button"
            onClick={() => {
              if (isElectron) window.blueDesktop?.minimize();
            }}
            title="Minimize"
            className="w-2.5 h-2.5 rounded-full border border-neutral-400 dark:border-neutral-600 bg-transparent hover:bg-neutral-400 dark:hover:bg-neutral-600 transition-colors"
          />
          <button
            type="button"
            onClick={() => {
              if (isElectron) {
                window.blueDesktop?.maximize();
              } else {
                onToggleFramedPreview();
              }
            }}
            title={
              isElectron
                ? 'Maximize / Restore'
                : framedPreview
                ? 'Expand to Full Viewport'
                : 'Preview Floating Desktop Window'
            }
            className="w-2.5 h-2.5 rounded-full border border-neutral-400 dark:border-neutral-600 bg-neutral-300 dark:bg-neutral-700 hover:bg-black dark:hover:bg-white transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={onToggleSidebar}
          title="Toggle Sidebar (Ctrl+B)"
          className={cn(
            'app-no-drag p-1.5 rounded-lg transition-colors',
            sidebarOpen
              ? 'bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white'
              : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
          )}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <span className="hidden sm:inline font-semibold tracking-tight text-sm text-black dark:text-white select-none pr-1">
          blue.ai
        </span>

        {/* Prominent Top Header Groq Model Selector */}
        <ModelSwitcher
          models={models}
          selectedModelId={selectedModelId}
          onSelectModel={onSelectModel}
          onRefreshModels={onRefreshModels}
          placement="bottom"
        />
      </div>

      {/* Center: Quick Command Search Trigger */}
      <div className="hidden lg:flex flex-1 max-w-xs mx-2 justify-center">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="app-no-drag w-full h-8 px-3 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 hover:border-black dark:hover:border-white transition-all flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 group"
        >
          <span className="flex items-center gap-1.5 truncate">
            <Command className="w-3.5 h-3.5 text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
            <span>Search & commands...</span>
          </span>
          <kbd className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Groq Status, Pure White/Black Theme Switch, Window Controls */}
      <div className="app-no-drag flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onOpenSettings}
          title="Configure Groq API Key & Settings (Ctrl+,)"
          className={cn(
            'h-8 px-2.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all border',
            hasApiKey
              ? 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-black dark:text-white hover:border-black dark:hover:border-white'
              : 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black hover:opacity-90'
          )}
        >
          {hasApiKey ? (
            <>
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full bg-black dark:bg-white',
                  isStreaming && 'animate-ping'
                )}
              />
              <Zap className="w-3 h-3" />
              <span className="hidden md:inline">Groq Connected</span>
            </>
          ) : (
            <>
              <KeyRound className="w-3 h-3" />
              <span>Connect Key</span>
            </>
          )}
        </button>

        {/* Segmented Pure White / Pure Black Theme Toggle */}
        <div
          role="group"
          aria-label="Theme Mode"
          className="h-8 p-0.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 flex items-center"
        >
          <button
            type="button"
            onClick={() => onToggleTheme('light')}
            title="Pure White Mode"
            className={cn(
              'relative px-2 h-full rounded-full text-[11px] font-medium flex items-center gap-1 transition-colors z-10',
              theme === 'light'
                ? 'text-white'
                : 'text-neutral-500 hover:text-white'
            )}
          >
            {theme === 'light' && (
              <motion.span
                layoutId="theme-pill"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                className="absolute inset-0 rounded-full bg-black -z-10"
              />
            )}
            <Sun className="w-3 h-3" />
            <span className="hidden xl:inline">White</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleTheme('dark')}
            title="Pure Black Mode"
            className={cn(
              'relative px-2 h-full rounded-full text-[11px] font-medium flex items-center gap-1 transition-colors z-10',
              theme === 'dark'
                ? 'text-black'
                : 'text-neutral-500 hover:text-black'
            )}
          >
            {theme === 'dark' && (
              <motion.span
                layoutId="theme-pill"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                className="absolute inset-0 rounded-full bg-white -z-10"
              />
            )}
            <Moon className="w-3 h-3" />
            <span className="hidden xl:inline">Black</span>
          </button>
        </div>

        {isElectron ? (
          <button
            type="button"
            onClick={handleTogglePin}
            title={alwaysOnTop ? 'Unpin Always-on-Top' : 'Pin Window Always-on-Top'}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              alwaysOnTop
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
            )}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleFramedPreview}
            title={
              framedPreview
                ? 'Switch to Fullscreen Studio'
                : 'Preview Desktop Window Frame'
            }
            className={cn(
              'hidden sm:inline-flex p-1.5 rounded-lg transition-colors',
              framedPreview
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
            )}
          >
            <AppWindow className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={onToggleInspector}
          title="Model Parameters & System Prompt (Ctrl+.)"
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            inspectorOpen
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>

        {isElectron && (
          <div className="flex items-center pl-1 ml-1 border-l border-neutral-200 dark:border-neutral-800 gap-0.5">
            <button
              type="button"
              onClick={() => window.blueDesktop?.minimize()}
              className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-500 hover:text-black dark:hover:text-white"
              title="Minimize"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => window.blueDesktop?.maximize()}
              className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-500 hover:text-black dark:hover:text-white"
              title={isMaximized ? 'Restore' : 'Maximize'}
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
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
