import { type ReactNode } from 'react';
import { Link } from '@/components/Router';

export function Logo({ size = 'md', withText = true }: { size?: 'sm' | 'md' | 'lg'; withText?: boolean }) {
  const dims = { sm: 'h-7 w-7 text-base', md: 'h-8 w-8 text-lg', lg: 'h-10 w-10 text-xl' }[size];
  const text = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' }[size];

  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <span
        className={`relative grid place-items-center rounded-xl border border-accent/30 bg-accent/10 font-display font-bold text-accent transition group-hover:border-accent/60 group-hover:shadow-glow ${dims}`}
      >
        B
        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft" />
      </span>
      {withText && (
        <span className={`font-display font-semibold tracking-tight text-white ${text}`}>
          B<span className="text-accent">.io</span>
        </span>
      )}
    </Link>
  );
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] px-6 py-12 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-white/[0.04] text-ink-200">{icon}</div>
      <h3 className="font-display text-base font-semibold text-white">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-200">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-ink-200">{label}</span>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.04] text-accent">{icon}</span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-300">{hint}</p>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between gap-4 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink-50">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-300">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        className={`relative h-6 w-11 shrink-0 rounded-full border border-white/[0.06] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
          checked ? 'bg-accent' : 'bg-white/[0.08]'
        } ${disabled ? 'pointer-events-none' : 'hover:brightness-110'}`}
      >
        <span
          className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-md transition-all duration-200 ${
            checked ? 'left-[calc(100%-1.125rem-0.25rem)]' : 'left-0.5'
          }`}
          style={{ width: '1.125rem', height: '1.125rem' }}
        />
      </button>
    </label>
  );
}
