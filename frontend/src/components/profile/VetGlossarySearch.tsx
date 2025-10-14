// frontend/src/components/analyzer/VetGlossarySearch.tsx
// VET glossary search component for training terminology lookup.
// Displays term description, acronyms, also_called names, and clickable see_also links.

import React, { useState } from "react";
import { Search, BookOpen, Link as LinkIcon, X } from "lucide-react";
import { useGlossaryDetail } from "../../hooks/queries/useGlossaryDetail";

interface VetGlossarySearchProps {
  /** Optional CSS class for the root element */
  className?: string;
}

/**
 * VET Glossary Search Component
 * 
 * Features:
 * - Search input for VET terminology
 * - Displays term description, acronym, also_called names
 * - Clickable see_also links that auto-populate search
 * - Clean, compact design matching project style
 * - Inline results display (no modal)
 */
export default function VetGlossarySearch({ className = "" }: VetGlossarySearchProps) {
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState<string | null>(null);

  const { data, isFetching, isError } = useGlossaryDetail(searchTerm);

  // Handle search submission
  const handleSearch = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      setSearchTerm(trimmed);
    }
  };

  // Handle Enter key in search input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Handle clicking a see_also term
  const handleSeeAlsoClick = (term: string) => {
    setInputValue(term);
    setSearchTerm(term);
  };

  // Clear search
  const handleClear = () => {
    setInputValue("");
    setSearchTerm(null);
  };

  return (
    <div className={`rounded-xl border border-border bg-white shadow-card p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
        <h3 className="text-lg font-heading font-bold text-ink">VET Terminology</h3>
      </div>

      {/* Helper text */}
      <p className="text-sm text-ink-soft mb-4">
        Search for VET (Vocational Education and Training) terms if you encounter unfamiliar terminology while reviewing courses.
      </p>

      {/* Search input */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a term (e.g., AQF, RTO, ASQA)"
            className="w-full px-4 py-2 pr-10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            aria-label="Search VET terminology"
          />
          {inputValue && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink transition"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={!inputValue.trim() || isFetching}
          className="px-4 py-2 bg-primary text-ink-invert rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-semibold"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </div>

      {/* Loading state */}
      {isFetching && (
        <div className="text-sm text-ink-soft py-4" aria-live="polite">
          Searching...
        </div>
      )}

      {/* Error state */}
      {isError && searchTerm && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          No results found for "{searchTerm}". Try a different term or check your spelling.
        </div>
      )}

      {/* Results */}
      {!isFetching && !isError && data && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Term title */}
          <div>
            <h4 className="text-base font-semibold text-ink mb-1">{data.term}</h4>
            {data.acronym && (
              <p className="text-sm text-ink-soft">
                <span className="font-medium">Acronym:</span> {data.acronym}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-ink leading-relaxed">{data.description}</p>
          </div>

          {/* Also called */}
          {data.also_called && data.also_called.length > 0 && (
            <div>
              <p className="text-sm font-medium text-ink mb-2">Also called:</p>
              <div className="flex flex-wrap gap-2">
                {data.also_called.map((name, index) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-1 rounded-full bg-gray-100 text-xs text-ink"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* See also - clickable links */}
          {data.see_also && data.see_also.length > 0 && (
            <div>
              <p className="text-sm font-medium text-ink mb-2 flex items-center gap-1">
                <LinkIcon className="h-4 w-4" />
                See also:
              </p>
              <div className="flex flex-wrap gap-2">
                {data.see_also.map((term, index) => (
                  <button
                    key={index}
                    onClick={() => handleSeeAlsoClick(term)}
                    className="inline-block px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition font-medium"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state (no search yet) */}
      {!searchTerm && !isFetching && (
        <div className="text-center py-8 text-ink-soft">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Enter a VET term above to see its definition</p>
        </div>
      )}
    </div>
  );
}