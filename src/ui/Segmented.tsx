/** UISegmentedControl-style picker. */
export default function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-[10px] bg-white/10 p-[3px]">
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`touch-target min-h-11 flex-1 rounded-[8px] px-2 text-[14px] font-semibold transition-all ${value === o.id ? 'bg-white/90 text-black shadow' : 'text-white/80'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
