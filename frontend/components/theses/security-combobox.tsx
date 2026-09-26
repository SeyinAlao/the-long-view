'use client';

import { useState, type KeyboardEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useSecuritiesSearch } from '@/hooks/use-securities-search';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Security } from '@/lib/securities';

interface SecurityComboboxProps {
  value: Security | null;
  onChange: (security: Security) => void;
  error?: string;
}

// A real combobox, not a plain <select> — 147 securities is too many to
// scroll through, and the whole point of building this against the real
// NGX list was to make search-by-ticker-or-name actually work.
export function SecurityCombobox({ value, onChange, error }: SecurityComboboxProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const { data: results, isLoading } = useSecuritiesSearch(query);
  const options = results ?? [];
  const displayValue = isOpen ? query : value ? `${value.ticker} — ${value.companyName}` : '';

  function selectSecurity(security: Security) {
    onChange(security);
    setQuery('');
    setIsOpen(false);
    setActiveIndex(0);
  }

  function handleFocus() {
    setIsOpen(true);
    setQuery('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(options.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (options[activeIndex]) selectSecurity(options[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div className="relative">
      <label htmlFor="security-search" className="text-sm text-ink/80">
        Security
      </label>
      <input
        id="security-search"
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="security-listbox"
        aria-autocomplete="list"
        aria-activedescendant={
          isOpen && options[activeIndex] ? `security-option-${options[activeIndex].id}` : undefined
        }
        autoComplete="off"
        placeholder="Search by ticker or company name"
        value={displayValue}
        onFocus={handleFocus}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        className={cn(
          'mt-1 w-full rounded-md border bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-brass',
          error ? 'border-terracotta' : 'border-ink/20',
        )}
      />
      {error && (
        <p className="mt-1 text-xs text-terracotta" role="alert">
          {error}
        </p>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            id="security-listbox"
            role="listbox"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={
              shouldReduceMotion ? { duration: 0.01 } : { type: 'spring', damping: 26, stiffness: 320 }
            }
            className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-ink/15 bg-cream"
          >
            {isLoading ? (
              <li className="space-y-2 p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </li>
            ) : options.length === 0 ? (
              <li className="p-3 text-sm text-muted">No securities match &ldquo;{query}&rdquo;</li>
            ) : (
              options.map((security, index) => (
                <li
                  key={security.id}
                  id={`security-option-${security.id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSecurity(security)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'cursor-pointer px-3 py-2 text-sm',
                    index === activeIndex && 'bg-brass/15',
                  )}
                >
                  <span className="font-medium">{security.ticker}</span>
                  <span className="text-muted"> — {security.companyName}</span>
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
