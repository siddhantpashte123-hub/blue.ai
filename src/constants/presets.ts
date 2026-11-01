import { GroqModelInfo, Persona, PromptTemplate } from '../types';

export const DEFAULT_GROQ_MODELS: GroqModelInfo[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    provider: 'Meta',
    contextWindow: 131072,
    speedLabel: '~330 tok/s',
    description: 'Flagship balanced intelligence for coding, reasoning, and multilingual chat.',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    provider: 'Meta',
    contextWindow: 131072,
    speedLabel: '~750 tok/s',
    description: 'Ultra-low latency instant responses for everyday tasks and fast iteration.',
  },
  {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    name: 'Llama 4 Scout 17B',
    provider: 'Meta',
    contextWindow: 131072,
    speedLabel: '~590 tok/s',
    supportsVision: true,
    description: 'Native multimodal Vision + Text model for screenshots, diagrams, and UI code.',
  },
  {
    id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    name: 'Llama 4 Maverick 17B',
    provider: 'Meta',
    contextWindow: 131072,
    speedLabel: '~480 tok/s',
    supportsVision: true,
    description: '128-expert MoE multimodal model with strong creative and visual comprehension.',
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B',
    provider: 'OpenAI OSS',
    contextWindow: 131072,
    speedLabel: '~500 tok/s',
    supportsReasoning: true,
    description: 'High-capability open-weight reasoning model for complex architecture & math.',
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT-OSS 20B',
    provider: 'OpenAI OSS',
    contextWindow: 131072,
    speedLabel: '~1000 tok/s',
    supportsReasoning: true,
    description: 'Blazingly fast 1,000+ tok/s reasoning model for rapid problem solving.',
  },
  {
    id: 'qwen/qwen3-32b',
    name: 'Qwen 3 32B',
    provider: 'Alibaba',
    contextWindow: 131072,
    speedLabel: '~420 tok/s',
    supportsReasoning: true,
    description: 'Hybrid chain-of-thought reasoning with strong multilingual & coding depth.',
  },
  {
    id: 'moonshotai/kimi-k2-instruct-0905',
    name: 'Kimi K2 Instruct',
    provider: 'Moonshot AI',
    contextWindow: 262144,
    speedLabel: '~250 tok/s',
    description: '1T MoE frontier coding, agentic tool-use, and long-context model.',
  },
  {
    id: 'groq/compound',
    name: 'Groq Compound',
    provider: 'Groq',
    contextWindow: 131072,
    speedLabel: 'Agentic',
    description: 'Agentic AI system with built-in web search and code execution.',
  },
  {
    id: 'groq/compound-mini',
    name: 'Groq Compound Mini',
    provider: 'Groq',
    contextWindow: 131072,
    speedLabel: 'Fast Agent',
    description: 'Low-latency agentic model with live web & tool synthesis.',
  },
];

export const DEFAULT_PERSONAS: Persona[] = [
  {
    id: 'general',
    name: 'Studio Core',
    tagline: 'Crisp, direct, high-signal AI assistant',
    icon: 'Sparkles',
    temperature: 0.6,
    systemPrompt:
      'You are blue.ai, an ultra-clean, sharp, and deeply helpful desktop AI assistant. Give structured, crystal-clear answers using clean Markdown, tables, and production-ready code blocks when helpful. Match the user\'s language naturally (including English, Hindi, or Hinglish).',
  },
  {
    id: 'architect',
    name: 'Code Architect',
    tagline: 'Senior systems & full-stack engineering',
    icon: 'Terminal',
    temperature: 0.25,
    systemPrompt:
      'You are a Principal Software Architect inside blue.ai Desktop Studio. Write clean, modular, type-safe, production-grade code without placeholders. When asked to build UI or visual demos, produce complete self-contained HTML/CSS/JS blocks so the user can preview them directly in the Live Artifact Canvas.',
  },
  {
    id: 'hinglish',
    name: 'Hinglish Companion',
    tagline: 'Friendly Hinglish + tech explainer',
    icon: 'MessageSquare',
    temperature: 0.7,
    systemPrompt:
      'Tum blue.ai ke smart Hinglish AI dost aur mentor ho. User se natural, friendly Hinglish (Hindi + English mix in Roman script) mein baat karo. Complex tech, coding, startup ideas, aur daily tasks ko ekdum simple aur practical tarike se samjhao.',
  },
  {
    id: 'reasoner',
    name: 'First Principles',
    tagline: 'Deep structured analytical breakdown',
    icon: 'Cpu',
    temperature: 0.35,
    systemPrompt:
      'You are a rigorous first-principles strategist and analytical thinker. Break down complex problems into fundamental truths, trade-offs, edge cases, and concrete action steps using crisp tables and numbered frameworks.',
  },
  {
    id: 'designer',
    name: 'Monochrome UI Lab',
    tagline: 'Interactive HTML/CSS/SVG generator',
    icon: 'Layers',
    temperature: 0.5,
    systemPrompt:
      'You are a minimalist UI/UX Design Engineer specializing in stark black-and-white monochrome interfaces inspired by Linear, Raycast, and Swiss typography. Whenever asked to design a component, dashboard, game, or calculator, output a complete single-file ```html artifact with embedded CSS & JS that renders cleanly in live preview.',
  },
  {
    id: 'writer',
    name: 'Editorial Polisher',
    tagline: 'Sharp copy, emails & clear writing',
    icon: 'Feather',
    temperature: 0.65,
    systemPrompt:
      'You are an executive editor and copywriter. Transform rough drafts into crisp, persuasive, zero-fluff prose. Offer 2–3 tone variations (Concise, Executive, Warm) when polishing messages or emails.',
  },
];

export const DEFAULT_PROMPTS: PromptTemplate[] = [
  {
    id: 'p-ui',
    command: '/ui',
    title: 'Generate Live Interactive UI Artifact',
    category: 'Canvas',
    content:
      'Build a sleek, interactive pure black-and-white monochrome Pomodoro Focus Timer & Task Widget as a single self-contained ```html file with smooth CSS animations and JavaScript.',
  },
  {
    id: 'p-code',
    command: '/code',
    title: 'Clean Code & Architecture Review',
    category: 'Engineering',
    content:
      'Review the following code or feature idea for performance, edge cases, and clean architecture, then provide a production-ready implementation:\n\n',
  },
  {
    id: 'p-explain',
    command: '/explain',
    title: 'Explain Like a Senior Mentor',
    category: 'Learning',
    content:
      'Explain this topic from first principles with a real-world analogy, a visual ASCII diagram, and key takeaways:\n\n',
  },
  {
    id: 'p-hinglish',
    command: '/hinglish',
    title: 'Samjhao in Simple Hinglish',
    category: 'Hinglish',
    content:
      'Mujhe is topic ko ekdum simple aur practical Hinglish mein step-by-step samjhao with examples:\n\n',
  },
  {
    id: 'p-fix',
    command: '/fix',
    title: 'Debug & Fix Error Fast',
    category: 'Engineering',
    content:
      'Diagnose the root cause of this bug/error and give me the exact fixed code with a brief explanation of why it failed:\n\n',
  },
  {
    id: 'p-summarize',
    command: '/summarize',
    title: 'Executive Bullet Summary',
    category: 'Productivity',
    content:
      'Distill the following text into: 1) One-sentence core thesis, 2) 5 high-signal bullet points, and 3) Action items:\n\n',
  },
  {
    id: 'p-brainstorm',
    command: '/brainstorm',
    title: '10 High-Leverage Ideas',
    category: 'Strategy',
    content:
      'Generate 10 contrarian, high-impact ideas for the following goal, ranked by Ease of Execution vs Potential Impact in a Markdown table:\n\n',
  },
  {
    id: 'p-translate',
    command: '/translate',
    title: 'Natural Multilingual Translate',
    category: 'Writing',
    content:
      'Translate and culturally adapt the following text into crisp English and natural Hinglish:\n\n',
  },
];

export const STARTER_CARDS = [
  {
    title: 'Interactive Monochrome Widget',
    subtitle: 'Generate a live HTML/JS app in Split Canvas',
    badge: 'LIVE ARTIFACT',
    prompt:
      'Create a super clean pure black-and-white interactive Minimalist Synth & Beat Pad (or Pomodoro Focus Studio) as a single self-contained ```html file with animations and working controls.',
  },
  {
    title: 'Desktop App Architecture',
    subtitle: 'System design, APIs & clean code patterns',
    badge: 'ARCHITECTURE',
    prompt:
      'Mujhe ek scalable AI SaaS + Desktop App ka modern system architecture samjhao (Frontend, Auth, Vector DB, Groq LPU streaming, aur caching) with a clean comparison table.',
  },
  {
    title: 'Deep First-Principles Reasoning',
    subtitle: 'Step-by-step analytical breakdown',
    badge: 'REASONING',
    prompt:
      'Compare Groq LPU architecture vs traditional GPU clusters for LLM token generation: why is Time-To-First-Token and tokens/sec radically faster?',
  },
  {
    title: 'Code Refactor & Optimization',
    subtitle: 'TypeScript patterns, algorithms & clean APIs',
    badge: 'ENGINEERING',
    prompt:
      'Write a clean, dependency-free TypeScript rate-limiter and retry queue with exponential backoff, jitter, and full unit-testable usage examples.',
  },
];

export const KEYBOARD_SHORTCUTS = [
  { keys: ['⌘ / Ctrl', 'K'], label: 'Open Command Palette' },
  { keys: ['⌘ / Ctrl', 'N'], label: 'Start New Thread' },
  { keys: ['⌘ / Ctrl', 'B'], label: 'Toggle Sidebar' },
  { keys: ['⌘ / Ctrl', '.'], label: 'Toggle Model Inspector' },
  { keys: ['⌘ / Ctrl', ','], label: 'Open Groq & Studio Settings' },
  { keys: ['⌘ / Ctrl', 'Shift', 'L'], label: 'Switch White / Black Theme' },
  { keys: ['/'], label: 'Trigger Slash Prompt Menu' },
];
