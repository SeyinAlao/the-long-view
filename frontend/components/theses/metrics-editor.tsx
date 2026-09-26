'use client';

import { useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export interface MetricRow {
  id: string;
  label: string;
  value: string;
}

interface MetricsEditorProps {
  metrics: MetricRow[];
  onChange: (metrics: MetricRow[]) => void;
}

const MAX_METRICS = 10;

export function MetricsEditor({ metrics, onChange }: MetricsEditorProps) {
  const nextId = useRef(0);
  const shouldReduceMotion = useReducedMotion();

  function addMetric() {
    if (metrics.length >= MAX_METRICS) return;
    nextId.current += 1;
    onChange([...metrics, { id: `metric-${nextId.current}`, label: '', value: '' }]);
  }

  function updateMetric(id: string, field: 'label' | 'value', text: string) {
    onChange(metrics.map((m) => (m.id === id ? { ...m, [field]: text } : m)));
  }

  function removeMetric(id: string) {
    onChange(metrics.filter((m) => m.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink/80">Key metrics</span>
        <button
          type="button"
          onClick={addMetric}
          disabled={metrics.length >= MAX_METRICS}
          className="text-xs font-medium text-brass-dark hover:underline disabled:opacity-40"
        >
          + Add metric
        </button>
      </div>

      <div className="mt-2 space-y-2">
        <AnimatePresence initial={false}>
          {metrics.map((metric) => (
            <motion.div
              key={metric.id}
              layout={!shouldReduceMotion}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={
                shouldReduceMotion ? { duration: 0.01 } : { type: 'spring', damping: 28, stiffness: 340 }
              }
              className="flex gap-2 overflow-hidden"
            >
              <input
                aria-label="Metric label"
                placeholder="Net margin trend"
                value={metric.label}
                onChange={(e) => updateMetric(metric.id, 'label', e.target.value)}
                maxLength={60}
                className="w-1/2 rounded-md border border-ink/20 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-brass"
              />
              <input
                aria-label="Metric value"
                placeholder="Improving"
                value={metric.value}
                onChange={(e) => updateMetric(metric.id, 'value', e.target.value)}
                maxLength={120}
                className="w-1/2 rounded-md border border-ink/20 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-brass"
              />
              <button
                type="button"
                onClick={() => removeMetric(metric.id)}
                aria-label="Remove this metric"
                className="shrink-0 px-1 text-muted hover:text-terracotta"
              >
                <i className="bx bx-x text-lg" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
