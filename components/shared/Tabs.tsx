import type { KeyboardEvent } from "react";

type TabsProps<T extends string> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function Tabs<T extends string>({ label, options, value, onChange }: TabsProps<T>) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    const index = options.findIndex((option) => option.value === value);
    onChange(options[(index + step + options.length) % options.length].value);
    const tabs = event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]");
    tabs[(index + step + options.length) % options.length]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="inline-flex rounded-full bg-wheat-tint p-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-4 py-1.5 text-caption font-semibold transition-colors ${selected ? "bg-wheat text-black" : "text-charcoal hover:text-black"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
