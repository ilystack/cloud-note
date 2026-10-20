import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Lightweight, zero-dependency Markdown parser for AI chat responses
 * Handles bold (**text**), italic (*text* or _text_), inline code (`code`),
 * fenced code blocks, headings, lists, blockquotes, and paragraphs.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // Render inline formatting (bold, italic, code, link)
  const renderInline = (text: string): React.ReactNode[] => {
    // Regex matches inline code `...`, bold **...**, italic *...* or _..._
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;

      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-200/80 dark:bg-neutral-800/90 font-mono text-[11px] text-pink-600 dark:text-pink-300 font-medium"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={index} className="font-bold text-slate-900 dark:text-neutral-100">
            {part.slice(2, -2)}
          </strong>
        );
      }

      if (
        (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
        (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
      ) {
        return (
          <em key={index} className="italic text-slate-800 dark:text-neutral-200">
            {part.slice(1, -1)}
          </em>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  // Split into lines for block-level parsing
  const rawLines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeLang = '';
  let inList: 'ul' | 'ol' | null = null;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      const ListTag = inList === 'ul' ? 'ul' : 'ol';
      blocks.push(
        <ListTag
          key={`list-${blocks.length}`}
          className={`space-y-1 my-2 pl-4 text-xs sm:text-sm ${
            inList === 'ul' ? 'list-disc' : 'list-decimal'
          }`}
        >
          {listItems}
        </ListTag>
      );
      listItems = [];
      inList = null;
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    // Check code block fence
    if (line.trim().startsWith('```')) {
      flushList();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
        codeBlockLines = [];
      } else {
        inCodeBlock = false;
        blocks.push(
          <div
            key={`code-${blocks.length}`}
            className="my-2.5 rounded-xl bg-slate-900 dark:bg-black/60 border border-slate-800 dark:border-neutral-800/80 overflow-hidden text-left"
          >
            {codeLang && (
              <div className="px-3.5 py-1 text-[10px] font-mono uppercase bg-slate-800/60 dark:bg-neutral-900/60 text-slate-400 dark:text-neutral-400 border-b border-slate-800 dark:border-neutral-800">
                {codeLang}
              </div>
            )}
            <pre className="p-3.5 overflow-x-auto text-xs font-mono text-slate-100 dark:text-neutral-200 leading-relaxed">
              <code>{codeBlockLines.join('\n')}</code>
            </pre>
          </div>
        );
        codeBlockLines = [];
        codeLang = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList();
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      blocks.push(
        <h3
          key={`h3-${blocks.length}`}
          className="text-xs sm:text-sm font-bold text-slate-900 dark:text-neutral-100 mt-3 mb-1 tracking-tight"
        >
          {renderInline(trimmed.slice(4))}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      blocks.push(
        <h2
          key={`h2-${blocks.length}`}
          className="text-sm sm:text-base font-bold text-slate-900 dark:text-neutral-100 mt-3.5 mb-1.5 tracking-tight"
        >
          {renderInline(trimmed.slice(3))}
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith('# ')) {
      flushList();
      blocks.push(
        <h1
          key={`h1-${blocks.length}`}
          className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-neutral-100 mt-4 mb-2 tracking-tight"
        >
          {renderInline(trimmed.slice(2))}
        </h1>
      );
      continue;
    }

    // Unordered List (- or *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (inList !== 'ul') {
        flushList();
        inList = 'ul';
      }
      listItems.push(
        <li key={`li-${listItems.length}`} className="leading-relaxed">
          {renderInline(trimmed.slice(2))}
        </li>
      );
      continue;
    }

    // Ordered List (1. , 2. )
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (inList !== 'ol') {
        flushList();
        inList = 'ol';
      }
      listItems.push(
        <li key={`li-${listItems.length}`} className="leading-relaxed">
          {renderInline(olMatch[2])}
        </li>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      blocks.push(
        <blockquote
          key={`quote-${blocks.length}`}
          className="border-l-2 border-purple-500/60 dark:border-purple-400/60 pl-3 my-2 text-xs italic text-slate-600 dark:text-neutral-400 leading-relaxed"
        >
          {renderInline(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Normal Paragraph
    flushList();
    blocks.push(
      <p key={`p-${blocks.length}`} className="my-1.5 leading-relaxed text-xs sm:text-sm">
        {renderInline(line)}
      </p>
    );
  }

  flushList();

  return <div className="space-y-1">{blocks}</div>;
};
