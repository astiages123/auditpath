import { memo } from 'react';
import { SearchResult } from '../hooks/useSearch';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

interface SearchResultsSidebarProps {
  results: SearchResult[];
  onResultClick: (result: SearchResult) => void;
  query: string;
}

export const SearchResultsSidebar = memo(function SearchResultsSidebar({
  results,
  onResultClick,
  query,
}: SearchResultsSidebarProps) {
  return (
    <nav className="h-full flex flex-col bg-card select-none">
      <div className="p-4 border-b border-border/30 flex items-center justify-between bg-primary/5">
        <h2 className="text-[11px] font-black tracking-[0.2em] text-primary uppercase">
          ARAMA SONUÇLARI
        </h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {results.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
            <p className="text-sm text-muted-foreground italic">
              "{query}" için sonuç bulunamadı.
            </p>
          </div>
        ) : (
          results.map((result) => (
            <button
              key={result.id}
              onClick={() => onResultClick(result)}
              className="w-full group text-left p-3 rounded-xl border border-border/40 bg-card/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300"
            >
              <div className="text-[13px] leading-relaxed overflow-hidden">
                <div className="text-muted-foreground/60 line-clamp-2">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[
                      [rehypeKatex, { strict: false, throwOnError: false }],
                      rehypeRaw,
                    ]}
                    components={{
                      p: ({ children }) => (
                        <span className="inline">...{children}...</span>
                      ),
                      mark: ({ children }) => (
                        <mark className="bg-accent/30 text-foreground font-bold px-1 rounded-sm">
                          {children}
                        </mark>
                      ),
                    }}
                  >
                    {`${result.before}<mark>${result.match}</mark>${result.after}`}
                  </ReactMarkdown>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </nav>
  );
});
