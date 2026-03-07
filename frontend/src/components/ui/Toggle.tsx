interface ToggleProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        className={`relative w-10 h-5.5 rounded-full transition-colors ${
          checked ? 'bg-accent' : 'bg-bg-input border border-border'
        }`}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => e.key === ' ' && onChange(!checked)}
      >
        <div
          className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
      {label && <span className="text-sm text-text-secondary">{label}</span>}
    </label>
  );
}
