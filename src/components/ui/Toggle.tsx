interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

export default function Toggle({ checked, onChange, disabled, ...aria }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
        "disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",
        checked ? "bg-gold" : "bg-surface-2 border border-cleo-border",
      ].join(" ")}
      {...aria}
    >
      <span
        className={[
          "inline-block h-4 w-4 transform rounded-full bg-bg transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}
