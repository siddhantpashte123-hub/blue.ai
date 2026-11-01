import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import {
  DEFAULT_GROQ_MODELS,
  DEFAULT_PERSONAS,
  DEFAULT_PROMPTS,
} from './constants/presets';
import {
  generateAutoTitle,
  streamGroqChat,
  streamStudioDemo,
  validateAndFetchGroqModels,
} from './services/groq';
import {
  AppSettings,
  ArtifactItem,
  Attachment,
  ChatMessage,
  Conversation,
  GroqModelInfo,
  ModelParameters,
  Persona,
  PromptTemplate,
  ThemeMode,
} from './types';
import {
  cn,
  extractArtifacts,
  formatConversationAsMarkdown,
  saveFileUniversal,
  uid,
} from './utils/helpers';
import { ArtifactDrawer } from './components/ArtifactDrawer';
import { CommandPalette } from './components/CommandPalette';
import { Composer } from './components/Composer';
import { InspectorPanel } from './components/InspectorPanel';
import { MessageItem } from './components/MessageItem';
import {
  AnalyticsModal,
  PersonasModal,
  PromptsModal,
  SettingsModal,
} from './components/Modals';
import { Sidebar } from './components/Sidebar';
import { TitleBar } from './components/TitleBar';
import { WelcomeScreen } from './components/WelcomeScreen';

const STORAGE_KEY = 'blue_ai_desktop_v1';

const ENV_KEY = (() => {
  const raw = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  if (!raw || raw === 'gsk_your_groq_api_key_here') return '';
  return raw.trim();
})();

const DEFAULT_SETTINGS: AppSettings = {
  groqApiKey: ENV_KEY,
  theme: 'light',
  defaultModelId: 'llama-3.3-70b-versatile',
  defaultPersonaId: 'general',
  sendOnEnter: true,
  showTelemetry: true,
  framedWindowPreview: false,
  soundEffects: false,
};

interface PersistedState {
  settings?: Partial<AppSettings>;
  conversations?: Conversation[];
  customPersonas?: Persona[];
  customPrompts?: PromptTemplate[];
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PersistedState;
  } catch {
    return {};
  }
}

export const App: React.FC = () => {
  const initial = useMemo(() => loadInitialState(), []);

  const [settings, setSettings] = useState<AppSettings>({
    ...DEFAULT_SETTINGS,
    ...initial.settings,
    groqApiKey: initial.settings?.groqApiKey || ENV_KEY,
  });

  const [conversations, setConversations] = useState<Conversation[]>(
    initial.conversations || []
  );
  const [activeConvId, setActiveConvId] = useState<string | null>(
    initial.conversations?.[0]?.id || null
  );

  const [models, setModels] = useState<GroqModelInfo[]>(DEFAULT_GROQ_MODELS);
  const [selectedModelId, setSelectedModelId] = useState<string>(
    initial.conversations?.[0]?.modelId ||
      initial.settings?.defaultModelId ||
      DEFAULT_SETTINGS.defaultModelId
  );

  const [customPersonas, setCustomPersonas] = useState<Persona[]>(
    initial.customPersonas || []
  );
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(
    initial.conversations?.[0]?.personaId ||
      initial.settings?.defaultPersonaId ||
      DEFAULT_SETTINGS.defaultPersonaId
  );

  const [customPrompts, setCustomPrompts] = useState<PromptTemplate[]>(
    initial.customPrompts || []
  );

  const [params, setParams] = useState<ModelParameters>({
    temperature: 0.6,
    maxTokens: 4096,
    topP: 0.95,
    stream: true,
    customSystemSuffix: '',
  });

  // UI Layout & Modals
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth >= 900 : true
  );
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<ArtifactItem | null>(
    null
  );

  const [cmdOpen, setCmdOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [personasModalOpen, setPersonasModalOpen] = useState(false);
  const [promptsModalOpen, setPromptsModalOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);

  const [composerDraft, setComposerDraft] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollEnabledRef = useRef(true);

  const allPersonas = useMemo(
    () => [...DEFAULT_PERSONAS, ...customPersonas],
    [customPersonas]
  );
  const allPrompts = useMemo(
    () => [...DEFAULT_PROMPTS, ...customPrompts],
    [customPrompts]
  );

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConvId) || null,
    [conversations, activeConvId]
  );

  const activeModel = useMemo(
    () => models.find((m) => m.id === selectedModelId) || models[0],
    [models, selectedModelId]
  );

  const activePersona = useMemo(
    () =>
      allPersonas.find((p) => p.id === selectedPersonaId) || allPersonas[0],
    [allPersonas, selectedPersonaId]
  );

  // Sync Electron file storage on first mount if running in native Electron
  useEffect(() => {
    if (!window.blueDesktop?.readStorage) return;
    window.blueDesktop.readStorage().then((disk) => {
      if (!disk) return;
      const d = disk as PersistedState;
      if (d.settings) {
        setSettings((prev) => ({
          ...prev,
          ...d.settings,
          groqApiKey: d.settings?.groqApiKey || prev.groqApiKey,
        }));
      }
      if (Array.isArray(d.conversations) && d.conversations.length > 0) {
        setConversations(d.conversations);
      }
    });
  }, []);

  // Persist state changes locally
  useEffect(() => {
    const payload: PersistedState = {
      settings,
      conversations,
      customPersonas,
      customPrompts,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota limits
    }
    if (window.blueDesktop?.writeStorage) {
      window.blueDesktop.writeStorage(payload as Record<string, unknown>);
    }
  }, [settings, conversations, customPersonas, customPrompts]);

  // Apply Pure White / Pure Black theme class + native OS titlebar color
  useEffect(() => {
    const root = document.documentElement;
    const meta = document.getElementById('theme-color-meta');
    if (settings.theme === 'dark') {
      root.classList.add('dark');
      meta?.setAttribute('content', '#000000');
    } else {
      root.classList.remove('dark');
      meta?.setAttribute('content', '#FFFFFF');
    }
  }, [settings.theme]);

  // Ensure ENV_KEY hydrates immediately even if prior session had empty key
  useEffect(() => {
    if (!settings.groqApiKey.trim() && ENV_KEY) {
      setSettings((prev) => ({ ...prev, groqApiKey: ENV_KEY }));
    }
  }, [settings.groqApiKey]);

  const handleRefreshModels = useCallback(async () => {
    const key = settings.groqApiKey.trim();
    if (!key) return;
    const res = await validateAndFetchGroqModels(key);
    if (res.valid && res.models.length > 0) {
      setModels(res.models);
      setSelectedModelId((curr) =>
        res.models.some((m) => m.id === curr) ? curr : res.models[0].id
      );
    }
  }, [settings.groqApiKey]);

  // Auto-fetch live Groq models when API key is configured
  useEffect(() => {
    const key = settings.groqApiKey.trim();
    if (!key) return;
    let cancelled = false;
    validateAndFetchGroqModels(key).then((res) => {
      if (!cancelled && res.valid && res.models.length > 0) {
        setModels(res.models);
        setSelectedModelId((curr) =>
          res.models.some((m) => m.id === curr) ? curr : res.models[0].id
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [settings.groqApiKey]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleToggleTheme = useCallback(
    (mode: ThemeMode) => {
      updateSettings({ theme: mode });
    },
    [updateSettings]
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    autoScrollEnabledRef.current = distanceFromBottom < 120;
    setShowScrollBottom(distanceFromBottom > 220);
  };

  useEffect(() => {
    if (streamingMessageId && autoScrollEnabledRef.current) {
      scrollToBottom('auto');
    }
  }, [conversations, streamingMessageId, scrollToBottom]);

  // Start a new blank thread
  const handleNewChat = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setStreamingMessageId(null);
    }
    setActiveConvId(null);
    setActiveArtifact(null);
    setSelectedModelId(settings.defaultModelId);
    setSelectedPersonaId(settings.defaultPersonaId);
  }, [settings.defaultModelId, settings.defaultPersonaId]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      const target = conversations.find((c) => c.id === id);
      setActiveConvId(id);
      setActiveArtifact(null);
      if (target) {
        setSelectedModelId(target.modelId);
        setSelectedPersonaId(target.personaId);
      }
      setTimeout(() => scrollToBottom('auto'), 20);
    },
    [conversations, scrollToBottom]
  );

  const handleSelectPersona = useCallback(
    (personaId: string) => {
      setSelectedPersonaId(personaId);
      const found = allPersonas.find((p) => p.id === personaId);
      if (found) {
        setParams((prev) => ({ ...prev, temperature: found.temperature }));
      }
      if (activeConvId) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvId ? { ...c, personaId } : c
          )
        );
      }
    },
    [allPersonas, activeConvId]
  );

  const handleSelectModel = useCallback(
    (modelId: string) => {
      setSelectedModelId(modelId);
      if (activeConvId) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConvId ? { ...c, modelId } : c))
        );
      }
    },
    [activeConvId]
  );

  // Core assistant streaming runner
  const runGeneration = useCallback(
    async ({
      convId,
      historyUpToUser,
      assistantMsgId,
      modelId,
      personaId,
      forceDemo = false,
      autoTitleFirstPrompt,
    }: {
      convId: string;
      historyUpToUser: ChatMessage[];
      assistantMsgId: string;
      modelId: string;
      personaId: string;
      forceDemo?: boolean;
      autoTitleFirstPrompt?: string;
    }) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;
      setStreamingMessageId(assistantMsgId);
      autoScrollEnabledRef.current = true;

      const persona =
        allPersonas.find((p) => p.id === personaId) || allPersonas[0];
      const apiKey = settings.groqApiKey.trim();

      // If no API key and not explicitly running demo, show friendly actionable card
      if (!apiKey && !forceDemo) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id !== convId
              ? c
              : {
                  ...c,
                  updatedAt: Date.now(),
                  messages: c.messages.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          error:
                            'Paste your Groq API Key (gsk_...) to stream live responses from Groq LPU, or click "Preview Interactive Demo" below to test the UI & Live Artifact Canvas right now.',
                        }
                      : m
                  ),
                }
          )
        );
        setStreamingMessageId(null);
        abortRef.current = null;
        return;
      }

      let latestFinalContent = '';

      const callbacks = {
        onDelta: ({
          content,
          reasoning,
          reasoningDurationMs,
        }: {
          content: string;
          reasoning: string;
          reasoningDurationMs?: number;
        }) => {
          latestFinalContent = content;
          setConversations((prev) =>
            prev.map((c) =>
              c.id !== convId
                ? c
                : {
                    ...c,
                    updatedAt: Date.now(),
                    messages: c.messages.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            content,
                            reasoning,
                            reasoningDurationMs:
                              reasoningDurationMs ?? m.reasoningDurationMs,
                            error: undefined,
                          }
                        : m
                    ),
                  }
            )
          );
        },
        onComplete: (telemetry: ChatMessage['telemetry']) => {
          setConversations((prev) =>
            prev.map((c) =>
              c.id !== convId
                ? c
                : {
                    ...c,
                    updatedAt: Date.now(),
                    messages: c.messages.map((m) =>
                      m.id === assistantMsgId ? { ...m, telemetry } : m
                    ),
                  }
            )
          );
          setStreamingMessageId(null);
          abortRef.current = null;

          // Auto-open Split Canvas if response produced an HTML/SVG live artifact on desktop
          if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
            const arts = extractArtifacts(latestFinalContent, assistantMsgId);
            if (arts.length > 0) {
              setActiveArtifact(arts[0]);
            }
          }

          // Smart conversation auto-title on first turn
          if (autoTitleFirstPrompt) {
            generateAutoTitle(apiKey, autoTitleFirstPrompt).then((newTitle) => {
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === convId ? { ...c, title: newTitle } : c
                )
              );
            });
          }
        },
        onError: (errMsg: string) => {
          setConversations((prev) =>
            prev.map((c) =>
              c.id !== convId
                ? c
                : {
                    ...c,
                    updatedAt: Date.now(),
                    messages: c.messages.map((m) =>
                      m.id === assistantMsgId ? { ...m, error: errMsg } : m
                    ),
                  }
            )
          );
          setStreamingMessageId(null);
          abortRef.current = null;
        },
      };

      if (forceDemo) {
        const lastPrompt =
          historyUpToUser[historyUpToUser.length - 1]?.content || 'Hello';
        await streamStudioDemo({
          prompt: lastPrompt,
          modelId,
          signal: controller.signal,
          callbacks,
        });
      } else {
        await streamGroqChat({
          apiKey,
          modelId,
          messages: historyUpToUser,
          systemPrompt: persona.systemPrompt,
          params,
          signal: controller.signal,
          callbacks,
        });
      }
    },
    [allPersonas, params, settings.groqApiKey]
  );

  // Send message from Composer or Starter Card
  const handleSendMessage = useCallback(
    async (
      text: string,
      attachments: Attachment[] = [],
      forceDemo = false
    ) => {
      const now = Date.now();
      const userMsg: ChatMessage = {
        id: uid('msg'),
        role: 'user',
        content: text,
        attachments: attachments.length > 0 ? attachments : undefined,
        createdAt: now,
      };

      const assistantMsg: ChatMessage = {
        id: uid('msg'),
        role: 'assistant',
        content: '',
        createdAt: now + 1,
      };

      let targetConvId = activeConvId;
      let historyUpToUser: ChatMessage[] = [userMsg];
      let isFirstMessage = false;

      if (!targetConvId) {
        isFirstMessage = true;
        targetConvId = uid('conv');
        const provisionalTitle =
          (text || attachments[0]?.name || 'New Thread').slice(0, 40) +
          (text.length > 40 ? '…' : '');
        const newConv: Conversation = {
          id: targetConvId,
          title: provisionalTitle,
          messages: [userMsg, assistantMsg],
          modelId: selectedModelId,
          personaId: selectedPersonaId,
          createdAt: now,
          updatedAt: now,
        };
        setConversations((prev) => [newConv, ...prev]);
        setActiveConvId(targetConvId);
      } else {
        const existing = conversations.find((c) => c.id === targetConvId);
        isFirstMessage = !existing || existing.messages.length === 0;
        historyUpToUser = [...(existing?.messages || []), userMsg];
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetConvId
              ? {
                  ...c,
                  updatedAt: now,
                  messages: [...c.messages, userMsg, assistantMsg],
                }
              : c
          )
        );
      }

      setTimeout(() => scrollToBottom('smooth'), 30);

      await runGeneration({
        convId: targetConvId,
        historyUpToUser,
        assistantMsgId: assistantMsg.id,
        modelId: selectedModelId,
        personaId: selectedPersonaId,
        forceDemo,
        autoTitleFirstPrompt: isFirstMessage ? text || 'Image Analysis' : undefined,
      });
    },
    [
      activeConvId,
      conversations,
      runGeneration,
      scrollToBottom,
      selectedModelId,
      selectedPersonaId,
    ]
  );

  const handleStopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamingMessageId(null);
  }, []);

  // Regenerate assistant message (optionally switching model)
  const handleRegenerate = useCallback(
    async (assistantMessageId: string, overrideModelId?: string) => {
      if (!activeConversation) return;
      const idx = activeConversation.messages.findIndex(
        (m) => m.id === assistantMessageId
      );
      if (idx === -1) return;

      const historyUpToUser = activeConversation.messages.slice(0, idx);
      if (historyUpToUser.length === 0) return;

      const nextModel = overrideModelId || selectedModelId;
      if (overrideModelId) {
        setSelectedModelId(overrideModelId);
      }

      const freshAssistant: ChatMessage = {
        id: uid('msg'),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                modelId: nextModel,
                updatedAt: Date.now(),
                messages: [...historyUpToUser, freshAssistant],
              }
            : c
        )
      );

      await runGeneration({
        convId: activeConversation.id,
        historyUpToUser,
        assistantMsgId: freshAssistant.id,
        modelId: nextModel,
        personaId: selectedPersonaId,
      });
    },
    [activeConversation, runGeneration, selectedModelId, selectedPersonaId]
  );

  // Run interactive demo on the last turn if user clicked "Preview Interactive Demo"
  const handleRunDemoForLastTurn = useCallback(async () => {
    if (!activeConversation || activeConversation.messages.length === 0) return;
    const msgs = activeConversation.messages;
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg.role !== 'assistant') return;
    const historyUpToUser = msgs.slice(0, -1);

    await runGeneration({
      convId: activeConversation.id,
      historyUpToUser,
      assistantMsgId: lastMsg.id,
      modelId: selectedModelId,
      personaId: selectedPersonaId,
      forceDemo: true,
    });
  }, [activeConversation, runGeneration, selectedModelId, selectedPersonaId]);

  // Edit an earlier user message & branch/re-run from there
  const handleEditUserMessage = useCallback(
    async (userMessageId: string, newContent: string) => {
      if (!activeConversation) return;
      const idx = activeConversation.messages.findIndex(
        (m) => m.id === userMessageId
      );
      if (idx === -1) return;

      const updatedUserMsg: ChatMessage = {
        ...activeConversation.messages[idx],
        content: newContent,
      };
      const historyUpToUser = [
        ...activeConversation.messages.slice(0, idx),
        updatedUserMsg,
      ];
      const freshAssistant: ChatMessage = {
        id: uid('msg'),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                updatedAt: Date.now(),
                messages: [...historyUpToUser, freshAssistant],
              }
            : c
        )
      );

      await runGeneration({
        convId: activeConversation.id,
        historyUpToUser,
        assistantMsgId: freshAssistant.id,
        modelId: selectedModelId,
        personaId: selectedPersonaId,
      });
    },
    [activeConversation, runGeneration, selectedModelId, selectedPersonaId]
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeConvId === id) {
          setActiveConvId(next[0]?.id || null);
          setActiveArtifact(null);
        }
        return next;
      });
    },
    [activeConvId]
  );

  const handleTogglePin = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  }, []);

  const handleRenameConversation = useCallback((id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
  }, []);

  const handleExportConversation = useCallback((conv: Conversation) => {
    const md = formatConversationAsMarkdown(conv);
    const slug = conv.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    saveFileUniversal(`${slug || 'thread'}.md`, md, 'text/markdown;charset=utf-8');
  }, []);

  const handleExportFullBackup = useCallback(() => {
    const backup = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        app: 'blue.ai Desktop Studio',
        conversations,
        customPersonas,
        customPrompts,
      },
      null,
      2
    );
    saveFileUniversal(
      `blue-ai-workspace-${new Date().toISOString().slice(0, 10)}.json`,
      backup,
      'application/json;charset=utf-8'
    );
  }, [conversations, customPersonas, customPrompts]);

  // Global Desktop Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const key = e.key.toLowerCase();
      if (key === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
      } else if (key === 'n') {
        e.preventDefault();
        handleNewChat();
      } else if (key === 'b') {
        e.preventDefault();
        setSidebarOpen((o) => !o);
      } else if (e.key === '.') {
        e.preventDefault();
        setInspectorOpen((o) => !o);
      } else if (e.key === ',') {
        e.preventDefault();
        setSettingsModalOpen((o) => !o);
      } else if (e.shiftKey && key === 'l') {
        e.preventDefault();
        updateSettings({
          theme: settings.theme === 'light' ? 'dark' : 'light',
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNewChat, settings.theme, updateSettings]);

  const estimatedContextChars = useMemo(() => {
    if (!activeConversation) return 0;
    return activeConversation.messages.reduce(
      (sum, m) => sum + m.content.length,
      0
    );
  }, [activeConversation]);

  const isFramed =
    settings.framedWindowPreview && !window.blueDesktop?.isElectron;

  return (
    <div
      className={cn(
        'w-full h-full transition-colors duration-300',
        isFramed
          ? settings.theme === 'dark'
            ? 'desktop-grid-dark p-3 sm:p-5 flex items-center justify-center'
            : 'desktop-grid-light p-3 sm:p-5 flex items-center justify-center'
          : 'bg-white dark:bg-black'
      )}
    >
      {/* Desktop App Shell */}
      <div
        className={cn(
          'w-full h-full flex flex-col overflow-hidden bg-white dark:bg-black text-black dark:text-white transition-all duration-300',
          isFramed &&
            'max-w-[1440px] max-h-[920px] rounded-2xl border border-neutral-300 dark:border-neutral-800 shadow-[0_28px_90px_rgba(0,0,0,0.22)] dark:shadow-[0_28px_90px_rgba(0,0,0,0.85)]'
        )}
      >
        {/* Top Desktop Window Bar */}
        <TitleBar
          theme={settings.theme}
          onToggleTheme={handleToggleTheme}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          inspectorOpen={inspectorOpen}
          onToggleInspector={() => setInspectorOpen((o) => !o)}
          onOpenCommandPalette={() => setCmdOpen(true)}
          onOpenSettings={() => setSettingsModalOpen(true)}
          hasApiKey={Boolean(settings.groqApiKey.trim())}
          isStreaming={Boolean(streamingMessageId)}
          framedPreview={settings.framedWindowPreview}
          onToggleFramedPreview={() =>
            updateSettings({
              framedWindowPreview: !settings.framedWindowPreview,
            })
          }
          models={models}
          selectedModelId={selectedModelId}
          onSelectModel={handleSelectModel}
          onRefreshModels={handleRefreshModels}
        />

        {/* Workspace Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden relative">
          {/* Left Thread Sidebar */}
          <Sidebar
            isOpen={sidebarOpen}
            conversations={conversations}
            activeId={activeConvId}
            onSelect={handleSelectConversation}
            onNewChat={handleNewChat}
            onDelete={handleDeleteConversation}
            onTogglePin={handleTogglePin}
            onRename={handleRenameConversation}
            onExport={handleExportConversation}
            onOpenPrompts={() => setPromptsModalOpen(true)}
            onOpenPersonas={() => setPersonasModalOpen(true)}
            onOpenAnalytics={() => setAnalyticsModalOpen(true)}
            onOpenSettings={() => setSettingsModalOpen(true)}
          />

          {/* Center Chat & Composer Column */}
          <main className="flex-1 min-w-0 flex flex-col bg-white dark:bg-black relative">
            {/* Scrollable Messages / Welcome Stage */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto"
            >
              {!activeConversation ||
              activeConversation.messages.length === 0 ? (
                <WelcomeScreen
                  hasApiKey={Boolean(settings.groqApiKey.trim())}
                  onSaveApiKey={(newKey, syncedModels) => {
                    updateSettings({ groqApiKey: newKey });
                    if (syncedModels && syncedModels.length > 0) {
                      setModels(syncedModels);
                    }
                  }}
                  models={models}
                  selectedModelId={selectedModelId}
                  onSelectModel={handleSelectModel}
                  personas={allPersonas}
                  selectedPersonaId={selectedPersonaId}
                  onSelectPersona={handleSelectPersona}
                  onPickPrompt={(promptText, forceDemo) => {
                    handleSendMessage(promptText, [], Boolean(forceDemo));
                  }}
                />
              ) : (
                <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 divide-y divide-neutral-100 dark:divide-neutral-900/70">
                  {activeConversation.messages.map((msg, idx) => {
                    const isLast =
                      idx === activeConversation.messages.length - 1;
                    return (
                      <MessageItem
                        key={msg.id}
                        message={msg}
                        isStreamingThis={streamingMessageId === msg.id}
                        showTelemetry={settings.showTelemetry}
                        models={models}
                        onRegenerate={handleRegenerate}
                        onEditUserMessage={handleEditUserMessage}
                        onOpenArtifact={(art) => setActiveArtifact(art)}
                        onOpenSettings={() => setSettingsModalOpen(true)}
                        onRunDemoForLastTurn={
                          isLast ? handleRunDemoForLastTurn : undefined
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Floating Scroll-To-Bottom Button */}
            <AnimatePresence>
              {showScrollBottom && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  type="button"
                  onClick={() => scrollToBottom('smooth')}
                  className="absolute bottom-28 left-1/2 -translate-x-1/2 h-8 px-3 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-medium shadow-lg flex items-center gap-1.5 z-20"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>Latest</span>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Bottom Floating Monochrome Composer */}
            <Composer
              onSend={(txt, atts) => handleSendMessage(txt, atts, false)}
              onStop={handleStopStreaming}
              isStreaming={Boolean(streamingMessageId)}
              sendOnEnter={settings.sendOnEnter}
              apiKey={settings.groqApiKey}
              models={models}
              selectedModelId={selectedModelId}
              onSelectModel={handleSelectModel}
              onRefreshModels={handleRefreshModels}
              personas={allPersonas}
              selectedPersonaId={selectedPersonaId}
              onSelectPersona={handleSelectPersona}
              prompts={allPrompts}
              externalDraft={composerDraft}
              onConsumeExternalDraft={() => setComposerDraft(null)}
            />
          </main>

          {/* Split-Screen Live HTML/SVG Artifact Canvas */}
          <ArtifactDrawer
            artifact={activeArtifact}
            onClose={() => setActiveArtifact(null)}
          />

          {/* Right Slide-Over Model Parameter Inspector */}
          <InspectorPanel
            isOpen={inspectorOpen}
            onClose={() => setInspectorOpen(false)}
            params={params}
            onChangeParams={setParams}
            activeModel={activeModel}
            activePersona={activePersona}
            estimatedContextChars={estimatedContextChars}
          />
        </div>
      </div>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
        onNewChat={handleNewChat}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenPrompts={() => setPromptsModalOpen(true)}
        onOpenPersonas={() => setPersonasModalOpen(true)}
        onOpenAnalytics={() => setAnalyticsModalOpen(true)}
        onExportCurrent={() => {
          if (activeConversation) handleExportConversation(activeConversation);
        }}
        conversations={conversations}
        onSelectConversation={handleSelectConversation}
        models={models}
        onSelectModel={handleSelectModel}
        personas={allPersonas}
        onSelectPersona={handleSelectPersona}
      />

      {/* Studio Modals */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        models={models}
        onSyncModels={(synced) => setModels(synced)}
        onExportBackup={handleExportFullBackup}
        onClearAllThreads={() => {
          setConversations([]);
          setActiveConvId(null);
          setActiveArtifact(null);
          setSettingsModalOpen(false);
        }}
      />

      <PersonasModal
        isOpen={personasModalOpen}
        onClose={() => setPersonasModalOpen(false)}
        personas={allPersonas}
        activePersonaId={selectedPersonaId}
        onSelectPersona={handleSelectPersona}
        onAddPersona={(p) => setCustomPersonas((prev) => [...prev, p])}
        onDeletePersona={(id) =>
          setCustomPersonas((prev) => prev.filter((p) => p.id !== id))
        }
      />

      <PromptsModal
        isOpen={promptsModalOpen}
        onClose={() => setPromptsModalOpen(false)}
        prompts={allPrompts}
        onInsertPrompt={(content) => setComposerDraft(content)}
        onAddPrompt={(tpl) => setCustomPrompts((prev) => [tpl, ...prev])}
        onDeletePrompt={(id) =>
          setCustomPrompts((prev) => prev.filter((p) => p.id !== id))
        }
      />

      <AnalyticsModal
        isOpen={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        conversations={conversations}
      />
    </div>
  );
};

export default App;
