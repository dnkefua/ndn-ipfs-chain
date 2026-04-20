import path from 'path';
import fs from 'fs';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function readDocFile(relPath: string): string {
  try {
    const full = path.join(process.cwd(), relPath);
    return fs.readFileSync(full, 'utf-8');
  } catch {
    return `> File not found: \`${relPath}\``;
  }
}

export const dynamic = 'force-static';

export default function DocsPage() {
  const whitepaper = readDocFile('../whitepaper.md');
  const ndpSpec = readDocFile('../specs/ndp_protocol.md');

  return (
    <div className="space-y-16">
      {/* Top nav / back link */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/dashboard"
            className="text-slate-600 dark:text-slate-400 hover:text-brand-600 transition-colors"
          >
            &larr; Back to dashboard
          </Link>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <Link href="/" className="text-slate-600 dark:text-slate-400 hover:text-brand-600 transition-colors">
            Home
          </Link>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <a
            href="#whitepaper"
            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Whitepaper
          </a>
          <a
            href="#ndp-spec"
            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            NDP Spec
          </a>
          <Link
            href="/whitepaper/index.html"
            className="px-2 py-1 rounded-md border border-brand-300 dark:border-brand-700 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 font-medium"
          >
            View Interactive
          </Link>
          <a
            href="/whitepaper.md"
            download
            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Download .md
          </a>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Documentation</h1>
        <p className="text-slate-600 dark:text-slate-400">
          NDN IPFS Chain whitepaper and NDP protocol specification.
        </p>
      </div>

      {/* Whitepaper */}
      <section id="whitepaper">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Whitepaper</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            NDN IPFS Chain — Enterprise IPFS for the AI Era
          </p>
        </div>
        <article className="prose prose-slate dark:prose-invert max-w-4xl mx-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{whitepaper}</ReactMarkdown>
        </article>
      </section>

      {/* NDP Protocol Spec */}
      <section id="ndp-spec">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            NDP Protocol Spec v1.0
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            NDN Data Protocol — structured, content-addressed records
          </p>
        </div>
        <article className="prose prose-slate dark:prose-invert max-w-4xl mx-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{ndpSpec}</ReactMarkdown>
        </article>
      </section>
    </div>
  );
}
