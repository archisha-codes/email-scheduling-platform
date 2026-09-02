import React from 'react';
import { Search, Database, Zap, X } from 'lucide-react';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  searchSource?: 'elasticsearch' | 'postgresql';
  isSearching: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onQueryChange,
  searchSource,
  isSearching,
}) => {
  return (
    <div className="relative flex items-center w-full max-w-md">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
        <Search className="w-4 h-4" />
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search emails by recipient, subject, body text..."
        className="w-full pl-10 pr-24 py-2 bg-[#151D2A] border border-[#232E42] rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#8B1E2D] focus:ring-1 focus:ring-[#8B1E2D] transition-all"
      />

      {query && (
        <button
          onClick={() => onQueryChange('')}
          className="absolute right-20 text-slate-400 hover:text-slate-200 p-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Search Engine Source Indicator Badge */}
      {query && searchSource && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          {searchSource === 'elasticsearch' ? (
            <>
              <Zap className="w-3 h-3 text-[#F4D35E]" />
              <span className="text-[#F4D35E] font-semibold">ES Engine</span>
            </>
          ) : (
            <>
              <Database className="w-3 h-3 text-[#457B9D]" />
              <span className="text-[#457B9D]">PostgreSQL</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
