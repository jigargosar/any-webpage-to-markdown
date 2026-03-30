import { useState, useEffect, useCallback } from 'react';
import './App.css';

interface ConvertResult {
  success: boolean;
  markdown?: string;
  title?: string;
  url?: string;
  error?: string;
}

type ViewMode = 'raw' | 'rendered';

function App() {
  const [markdown, setMarkdown] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('raw');
  const [frontmatter, setFrontmatter] = useState(false);
  const [selectionOnly, setSelectionOnly] = useState(false);
  const [copied, setCopied] = useState(false);

  const convert = useCallback(async (useSelectionOnly: boolean) => {
    setLoading(true);
    setError('');
    setMarkdown('');
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        setError('No active tab found');
        setLoading(false);
        return;
      }

      let result: ConvertResult | undefined;
      try {
        result = await browser.tabs.sendMessage(tab.id, {
          type: 'convert',
          selectionOnly: useSelectionOnly,
        });
      } catch {
        // Content script not injected — inject it and retry
        try {
          await browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['/content-scripts/content.js'],
          });
          result = await browser.tabs.sendMessage(tab.id, {
            type: 'convert',
            selectionOnly: useSelectionOnly,
          });
        } catch (injectErr) {
          const msg = injectErr instanceof Error ? injectErr.message : '';
          setError(
            msg.includes('Cannot access') || msg.includes('permission')
              ? 'Cannot access this page (chrome://, Web Store, etc.)'
              : 'Content script not loaded. Try reloading the page.',
          );
          setLoading(false);
          return;
        }
      }

      if (!result) {
        setError('No response from content script. Try reloading the page.');
      } else if (result.success && result.markdown) {
        setMarkdown(result.markdown);
        setTitle(result.title || '');
        setUrl(result.url || '');
      } else {
        setError(result.error || 'Conversion failed');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to convert page',
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    convert(selectionOnly);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleSelectionToggle = (value: boolean) => {
    setSelectionOnly(value);
    convert(value);
  };

  const getOutput = () => {
    if (!markdown) return '';
    if (frontmatter) {
      const date = new Date().toISOString().split('T')[0];
      return `---\ntitle: "${title.replace(/"/g, '\\"')}"\nurl: "${url.replace(/"/g, '\\"')}"\ndate: ${date}\n---\n\n${markdown}`;
    }
    return markdown;
  };

  const handleCopy = async () => {
    const output = getOutput();
    await navigator.clipboard.writeText(output);
    setCopied(true);
  };

  const handleDownload = () => {
    const output = getOutput();
    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) || 'page';
    const blob = new Blob([output], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const renderMarkdown = (md: string) => {
    const escapeAttr = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre><code>$2</code></pre>',
    );
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_match, text: string, href: string) =>
        `<a href="${escapeAttr(href)}" target="_blank">${text}</a>`,
    );
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(
      /((?:<li>.*<\/li>\n?)+)/g,
      '<ul>$1</ul>',
    );
    html = html.replace(
      /^(?!<[hluobpc]|<\/|<li|<hr|<pre|<str|<em|<a )(.+)$/gm,
      '<p>$1</p>',
    );

    return html;
  };

  const output = getOutput();
  const wordCount = markdown
    ? markdown.split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="flex flex-col h-full p-3 gap-2.5" style={{ width: 520, minHeight: 300, background: 'oklch(0.2 0.01 260)', color: 'oklch(0.9 0.01 260)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold mr-auto" style={{ color: 'oklch(0.85 0.05 260)' }}>
          Markdown
        </span>

        <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer select-none" style={{ color: 'oklch(0.7 0.01 260)' }}>
          <input
            type="checkbox"
            checked={selectionOnly}
            onChange={(e) => handleSelectionToggle(e.target.checked)}
            className="accent-[oklch(0.5_0.15_250)]"
          />
          Selection only
        </label>

        <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer select-none" style={{ color: 'oklch(0.7 0.01 260)' }}>
          <input
            type="checkbox"
            checked={frontmatter}
            onChange={(e) => setFrontmatter(e.target.checked)}
            className="accent-[oklch(0.5_0.15_250)]"
          />
          Frontmatter
        </label>

        {/* View toggle */}
        <div className="flex">
          <button
            className="px-2 py-1 text-xs border cursor-pointer rounded-l-md transition-colors"
            style={{
              background: viewMode === 'raw' ? 'oklch(0.4 0.1 250)' : 'oklch(0.25 0.01 260)',
              borderColor: viewMode === 'raw' ? 'oklch(0.45 0.1 250)' : 'oklch(0.35 0.02 260)',
              color: viewMode === 'raw' ? 'oklch(0.95 0.01 260)' : 'oklch(0.7 0.01 260)',
            }}
            onClick={() => setViewMode('raw')}
          >
            Raw
          </button>
          <button
            className={`px-2 py-1 text-xs border cursor-pointer rounded-r-md transition-colors`}
            style={{
              background: viewMode === 'rendered' ? 'oklch(0.4 0.1 250)' : 'oklch(0.25 0.01 260)',
              borderColor: viewMode === 'rendered' ? 'oklch(0.45 0.1 250)' : 'oklch(0.35 0.02 260)',
              color: viewMode === 'rendered' ? 'oklch(0.95 0.01 260)' : 'oklch(0.7 0.01 260)',
            }}
            onClick={() => setViewMode('rendered')}
          >
            Preview
          </button>
        </div>

        <button
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs cursor-pointer transition-colors border disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'oklch(0.45 0.15 250)',
            borderColor: 'oklch(0.5 0.15 250)',
            color: 'oklch(0.95 0.01 260)',
          }}
          onClick={handleCopy}
          disabled={!markdown}
        >
          Copy
        </button>
        <button
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs cursor-pointer transition-colors border disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'oklch(0.28 0.01 260)',
            borderColor: 'oklch(0.35 0.02 260)',
            color: 'oklch(0.85 0.01 260)',
          }}
          onClick={handleDownload}
          disabled={!markdown}
        >
          Save .md
        </button>
      </div>

      {/* Content area */}
      <div
        className="flex-1 min-h-[200px] max-h-[420px] overflow-auto rounded-lg border"
        style={{
          background: 'oklch(0.15 0.005 260)',
          borderColor: 'oklch(0.3 0.02 260)',
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[200px] text-sm" style={{ color: 'oklch(0.6 0.02 260)' }}>
            Converting...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full min-h-[200px] text-sm" style={{ color: 'oklch(0.65 0.2 25)' }}>
            {error}
          </div>
        ) : viewMode === 'raw' ? (
          <pre className="p-3 text-xs leading-relaxed whitespace-pre-wrap break-words font-mono" style={{ color: 'oklch(0.82 0.02 260)' }}>
            {output}
          </pre>
        ) : (
          <div
            className="markdown-rendered p-3 px-4 text-[13px] leading-relaxed"
            style={{ color: 'oklch(0.88 0.01 260)' }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(output) }}
          />
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between text-xs pt-0.5" style={{ color: 'oklch(0.55 0.02 260)' }}>
        <span>{markdown ? `${wordCount} words` : ''}</span>
        {copied && (
          <span className="text-xs font-medium" style={{ color: 'oklch(0.7 0.15 150)' }}>
            Copied!
          </span>
        )}
      </div>
    </div>
  );
}

export default App;
