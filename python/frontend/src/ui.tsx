/* eslint-disable react-refresh/only-export-components -- helpers live beside the components on purpose */
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import type { Priority } from './api';

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger'; busy?: boolean };

export function Button({ variant = 'primary', busy, className, children, disabled, ...rest }: BtnProps) {
  const styles = {
    primary: 'bg-brand text-white hover:bg-brand-dark',
    ghost: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[variant];
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        styles,
        className,
      )}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={cx('max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16 text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="px-4 py-12 text-center text-sm text-slate-500">{text}</div>;
}

export function ErrorBox({ text }: { text: string }) {
  if (!text) return null;
  return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{text}</div>;
}

const PRIORITY: Record<Priority, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={cx('rounded-full px-2 py-0.5 text-xs font-medium capitalize', PRIORITY[priority])}>{priority}</span>;
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'blue' }) {
  const t = { slate: 'bg-slate-100 text-slate-700', green: 'bg-green-100 text-green-700', blue: 'bg-blue-100 text-blue-700' }[tone];
  return <span className={cx('rounded-full px-2 py-0.5 text-xs font-medium', t)}>{children}</span>;
}

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const fmtMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? (m % 60) + 'm' : ''}`.trim() : `${m}m`);

export const todayISO = () => new Date().toLocaleDateString('en-CA');

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string }[] }) {
  return (
    <div role="tablist" className="inline-flex rounded-lg bg-slate-200/60 p-1">
      {items.map((i) => (
        <button
          key={i.id}
          role="tab"
          aria-selected={value === i.id}
          onClick={() => onChange(i.id)}
          className={cx('rounded-md px-3 py-1.5 text-sm font-medium', value === i.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}
