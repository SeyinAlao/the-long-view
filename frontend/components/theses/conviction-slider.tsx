interface ConvictionSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function ConvictionSlider({ value, onChange }: ConvictionSliderProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor="conviction" className="text-sm text-ink/80">
          Conviction
        </label>
        <span className="font-mono text-sm font-medium text-brass-dark">{value} / 10</span>
      </div>
      <input
        id="conviction"
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-brass mt-3 w-full"
        style={{ '--fill': `${((value - 1) / 9) * 100}%` } as React.CSSProperties}
      />
    </div>
  );
}
