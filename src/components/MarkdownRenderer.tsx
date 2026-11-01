import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Play,
  WrapText,
} from 'lucide-react';
import { ArtifactItem } from '../types';
import { cn, openExternalUrl, saveFileUniversal } from '../utils/helpers';

interface CodeBlockProps {
  language: string;
  code: string;
  messageId: string;
  onOpenArtifact?: (artifact: ArtifactItem) => void;
}

const EXT_MAP: Record<string, string> = {
  typescript: 'ts',
  ts: 'ts',
  tsx: 'tsx',
  javascript: 'js',
  js: 'js',
  jsx: 'jsx',
  python: 'py',
  py: 'py',
  html: 'html',
  css: 'css',
  json: 'json',
  svg: 'svg',
  bash: 'sh',
  sh: 'sh',
  sql: 'sql',
  markdown: 'md',
  md: 'md',
  rust: 'rs',
  go: 'go',
};

const CodeBlock: React.FC<CodeBlockProps> = ({
  language,
  code,
  messageId,
  onOpenArtifact,
}) => {
  const [copied, setCopied] = useState(false);
  const [wrapped, setWrapped] = useState(false);

  const normalizedLang = (language || 'code').toLowerCase();
  const isPreviewable =
    normalizedLang === 'html' ||
    normalizedLang === 'svg' ||
    (normalizedLang === 'xml' && code.trim().startsWith('<svg'));

  const lineCount = code.split('\n').length;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    const ext = EXT_MAP[normalizedLang] || 'txt';
    saveFileUniversal(`snippet-${Date.now().toString(36)}.${ext}`, code);
  };

  const handlePreview = () => {
    if (!onOpenArtifact) return;
    const titleMatch = code.match(/<title>(.*?)<\/title>/i);
    onOpenArtifact({
      id: `${messageId}_live_${normalizedLang}`,
      title:
        titleMatch?.[1]?.trim() ||
        `Live ${normalizedLang.toUpperCase()} Preview`,
      language: normalizedLang === 'xml' ? 'svg' : normalizedLang,
      code,
      messageId,
    });
  };

  return (
    <div className="my-3.5 rounded-2xl overflow-hidden border border-neutral-900 dark:border-neutral-800 bg-[#0A0A0A] text-neutral-100 shadow-sm">
      {/* Code Header Bar */}
      <div className="h-9 px-3.5 bg-[#121212] border-b border-neutral-800 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2 font-mono text-neutral-400">
          <span className="uppercase tracking-wider text-white font-medium">
            {normalizedLang}
          </span>
          <span className="text-neutral-600">•</span>
          <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
        </div>

        <div className="flex items-center gap-1">
          {isPreviewable && onOpenArtifact && (
            <button
              type="button"
              onClick={handlePreview}
              className="h-6 px-2.5 mr-1 rounded-full bg-white text-black font-medium text-[11px] flex items-center gap-1 hover:opacity-90 transition-opacity"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Live Preview</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setWrapped((w) => !w)}
            title="Toggle Word Wrap"
            className={cn(
              'p-1 rounded hover:bg-neutral-800 transition-colors',
              wrapped ? 'text-white bg-neutral-800' : 'text-neutral-400'
            )}
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleDownload}
            title="Save Snippet"
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="h-6 px-2 rounded text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-1 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <pre
        className={cn(
          'p-4 text-[12.5px] leading-relaxed font-mono overflow-x-auto text-neutral-100',
          wrapped && 'whitespace-pre-wrap break-words'
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
};

interface MarkdownRendererProps {
  content: string;
  messageId: string;
  onOpenArtifact?: (artifact: ArtifactItem) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  messageId,
  onOpenArtifact,
}) => {
  return (
    <div className="text-[14px] leading-7 text-neutral-900 dark:text-neutral-100 space-y-3 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-semibold tracking-tight text-black dark:text-white mt-5 mb-2 pb-1.5 border-b border-neutral-200 dark:border-neutral-800">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold tracking-tight text-black dark:text-white mt-4 mb-1.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[15px] font-semibold text-black dark:text-white mt-3.5 mb-1">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="leading-7 text-neutral-800 dark:text-neutral-200">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-800 dark:text-neutral-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1.5 text-neutral-800 dark:text-neutral-200">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-black dark:border-white pl-4 py-1 my-3 italic text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-900/60 rounded-r-lg">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-4 border-neutral-200 dark:border-neutral-800" />
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              onClick={(e) => {
                if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
                  e.preventDefault();
                  openExternalUrl(href);
                }
              }}
              className="inline-flex items-center gap-0.5 font-medium underline underline-offset-4 decoration-neutral-400 hover:decoration-black dark:hover:decoration-white text-black dark:text-white"
            >
              <span>{children}</span>
              <ExternalLink className="w-3 h-3 inline opacity-60" />
            </a>
          ),
          table: ({ children }) => (
            <div className="my-3.5 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-left border-collapse text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white border-b border-neutral-200 dark:border-neutral-800">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 font-semibold whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2.5 border-t border-neutral-200/70 dark:border-neutral-800/70 text-neutral-700 dark:text-neutral-300">
              {children}
            </td>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-([a-zA-Z0-9_-]+)/.exec(className || '');
            const rawText = String(children).replace(/\n$/, '');
            const isBlock = Boolean(match) || rawText.includes('\n');

            if (isBlock) {
              return (
                <CodeBlock
                  language={match?.[1] || 'text'}
                  code={rawText}
                  messageId={messageId}
                  onOpenArtifact={onOpenArtifact}
                />
              );
            }

            return (
              <code
                {...props}
                className="px-1.5 py-0.5 rounded-md font-mono text-[12.5px] bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-black dark:text-white"
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
