import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  Monitor,
  RotateCw,
  Smartphone,
  X,
} from 'lucide-react';
import { ArtifactItem } from '../types';
import { cn, saveFileUniversal } from '../utils/helpers';

interface ArtifactDrawerProps {
  artifact: ArtifactItem | null;
  onClose: () => void;
}

export const ArtifactDrawer: React.FC<ArtifactDrawerProps> = ({
  artifact,
  onClose,
}) => {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const srcDoc = useMemo(() => {
    if (!artifact) return '';
    if (artifact.language === 'svg') {
      return `<!DOCTYPE html><html><head><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#ffffff;}</style></head><body>${artifact.code}</body></html>`;
    }
    return artifact.code;
  }, [artifact]);

  const handleCopy = async () => {
    if (!artifact) return;
    await navigator.clipboard.writeText(artifact.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleDownload = () => {
    if (!artifact) return;
    const ext = artifact.language === 'svg' ? 'svg' : 'html';
    const slug = artifact.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    saveFileUniversal(`${slug || 'artifact'}.${ext}`, artifact.code);
  };

  return (
    <AnimatePresence>
      {artifact && (
        <motion.aside
          key="artifact-drawer"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '48%', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 34 }}
          className="hidden lg:flex h-full min-w-[400px] max-w-[680px] shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex-col overflow-hidden"
        >
          {/* Drawer Header */}
          <div className="h-12 px-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black flex items-center justify-between gap-2 shrink-0">
            <div className="min-w-0 flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-black text-white dark:bg-white dark:text-black">
                Canvas
              </span>
              <h3 className="text-xs font-semibold truncate text-black dark:text-white">
                {artifact.title}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Preview / Code Segmented Switch */}
              <div className="h-7 p-0.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 flex items-center">
                <button
                  type="button"
                  onClick={() => setTab('preview')}
                  className={cn(
                    'relative px-2.5 h-full rounded-full text-[11px] font-medium flex items-center gap-1 z-10 transition-colors',
                    tab === 'preview'
                      ? 'text-white dark:text-black'
                      : 'text-neutral-500'
                  )}
                >
                  {tab === 'preview' && (
                    <motion.span
                      layoutId="artifact-tab"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-black dark:bg-white -z-10"
                    />
                  )}
                  <Eye className="w-3 h-3" />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('code')}
                  className={cn(
                    'relative px-2.5 h-full rounded-full text-[11px] font-medium flex items-center gap-1 z-10 transition-colors',
                    tab === 'code'
                      ? 'text-white dark:text-black'
                      : 'text-neutral-500'
                  )}
                >
                  {tab === 'code' && (
                    <motion.span
                      layoutId="artifact-tab"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-black dark:bg-white -z-10"
                    />
                  )}
                  <Code2 className="w-3 h-3" />
                  <span>Source</span>
                </button>
              </div>

              {tab === 'preview' && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setViewport((v) =>
                        v === 'desktop' ? 'mobile' : 'desktop'
                      )
                    }
                    title="Switch Viewport Width"
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  >
                    {viewport === 'desktop' ? (
                      <Monitor className="w-3.5 h-3.5" />
                    ) : (
                      <Smartphone className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReloadKey((k) => k + 1)}
                    title="Reload Canvas"
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleCopy}
                title="Copy Source"
                className="p-1.5 rounded-lg text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-black dark:text-white" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={handleDownload}
                title="Download Artifact"
                className="p-1.5 rounded-lg text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onClose}
                title="Close Canvas"
                className="p-1.5 rounded-lg text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            {tab === 'preview' ? (
              <div
                className={cn(
                  'h-full rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white shadow-sm transition-all duration-300',
                  viewport === 'mobile' ? 'w-[375px]' : 'w-full'
                )}
              >
                <iframe
                  key={reloadKey}
                  title={artifact.title}
                  srcDoc={srcDoc}
                  sandbox="allow-scripts"
                  className="w-full h-full border-0 bg-white"
                />
              </div>
            ) : (
              <pre className="w-full h-full p-4 rounded-2xl bg-[#0A0A0A] text-neutral-100 font-mono text-xs leading-relaxed overflow-auto border border-neutral-800">
                <code>{artifact.code}</code>
              </pre>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
