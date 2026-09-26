const HORIZON_OPTIONS = [
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
  { label: '6 months', days: 180 },
  { label: '9 months', days: 270 },
  { label: '1 year', days: 365 },
  { label: '2 years', days: 730 },
];

interface HorizonPickerProps {
  value: number;
  onChange: (days: number) => void;
}

export function HorizonPicker({ value, onChange }: HorizonPickerProps) {
  return (
    <div>
      <span className="text-sm text-ink/80">Horizon</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {HORIZON_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            type="button"
            onClick={() => onChange(opt.days)}
            aria-pressed={value === opt.days}
            className={
              value === opt.days
                ? 'rounded-full border border-ink bg-ink px-4 py-2 text-sm text-cream'
                : 'rounded-full border border-ink/20 px-4 py-2 text-sm text-ink transition-colors hover:bg-ink/5'
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
