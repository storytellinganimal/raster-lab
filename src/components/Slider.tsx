interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}

// A labeled slider that always shows and accepts an exact numeric value,
// per the accessibility requirement -- sliders are never the only way to
// set a parameter.
export function Slider({ label, value, min, max, step = 1, onChange, suffix = '' }: SliderProps) {
  return (
    <label className="control-row">
      <span className="control-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
      />
      <span className="control-value">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(v);
          }}
          aria-label={`${label} exact value`}
        />
        {suffix}
      </span>
    </label>
  );
}
