import { useEffect, useRef, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/domain';

// ---------------------------------------------------------------------------
// Modal — yerel <dialog> öğesi (odak yakalama, ESC ile kapanma, erişilebilirlik)
// ---------------------------------------------------------------------------
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, description, children, footer, size = 'lg' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useRef(`dlg-${Math.random().toString(36).slice(2, 9)}`).current;

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'no-print m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] overflow-hidden rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm',
        size === 'md' && 'max-w-lg',
        size === 'lg' && 'max-w-2xl',
        size === 'xl' && 'max-w-4xl',
      )}
    >
      {open && (
        <article className="flex max-h-[92dvh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <hgroup>
              <h2 id={titleId} className="text-lg font-semibold text-navy">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
            </hgroup>
            <button type="button" onClick={onClose} aria-label="Pencereyi kapat" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              <X aria-hidden="true" className="size-5" />
            </button>
          </header>
          <section className="flex-1 overflow-y-auto px-5 py-4">{children}</section>
          {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">{footer}</footer>}
        </article>
      )}
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// Form alanları
// ---------------------------------------------------------------------------
const inputBase =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-medical focus:outline-none focus:ring-2 focus:ring-medical/25 disabled:bg-slate-100';

interface FieldWrapProps {
  label: string;
  id: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}
function FieldWrap({ label, id, hint, className, children }: FieldWrapProps) {
  return (
    <p className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </label>
      {children}
      {hint && (
        <small id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </small>
      )}
    </p>
  );
}

export function TextField({ label, id, hint, className, ...props }: { label: string; id: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldWrap label={label} id={id} hint={hint} className={className}>
      <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} className={inputBase} {...props} />
    </FieldWrap>
  );
}

export function SelectField({ label, id, hint, className, options, ...props }: { label: string; id: string; hint?: string; options: readonly string[] | { value: string; label: string }[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldWrap label={label} id={id} hint={hint} className={className}>
      <select id={id} aria-describedby={hint ? `${id}-hint` : undefined} className={inputBase} {...props}>
        {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </FieldWrap>
  );
}

export function TextAreaField({ label, id, hint, className, ...props }: { label: string; id: string; hint?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldWrap label={label} id={id} hint={hint} className={className}>
      <textarea id={id} rows={3} aria-describedby={hint ? `${id}-hint` : undefined} className={inputBase} {...props} />
    </FieldWrap>
  );
}

export function CheckboxField({ label, id, className, ...props }: { label: string; id: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <p className={cn('flex items-center gap-2', className)}>
      <input id={id} type="checkbox" className="size-4 rounded border-slate-300 text-medical accent-sky-600" {...props} />
      <label htmlFor={id} className="text-sm text-slate-700">
        {label}
      </label>
    </p>
  );
}

// ---------------------------------------------------------------------------
// Butonlar, rozetler, ilerleme çubuğu
// ---------------------------------------------------------------------------
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
export const btn = (variant: BtnVariant = 'primary', size: 'sm' | 'md' = 'md') =>
  cn(
    'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-medical disabled:cursor-not-allowed disabled:opacity-50',
    size === 'md' ? 'px-3.5 py-2 text-sm' : 'px-2.5 py-1.5 text-xs',
    variant === 'primary' && 'bg-medical text-white hover:bg-sky-700',
    variant === 'secondary' && 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
    variant === 'danger' && 'bg-alert text-white hover:bg-red-600',
    variant === 'success' && 'bg-emerald-600 text-white hover:bg-emerald-700',
    variant === 'ghost' && 'text-slate-700 hover:bg-slate-100',
  );

export function Badge({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return <span title={title} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-black/5', className)}>{children}</span>;
}

export function UsesBar({ value, max, level, label }: { value: number; max: number; level: 'critical' | 'warning' | 'ok'; label: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <span className="block">
      <span
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="block h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <span
          className={cn('block h-full rounded-full transition-all', level === 'critical' && 'bg-alert', level === 'warning' && 'bg-warn', level === 'ok' && 'bg-emerald-500')}
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  );
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <section className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      {icon}
      <h3 className="font-semibold text-slate-800">{title}</h3>
      {children && <p className="max-w-md text-sm text-slate-600">{children}</p>}
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <hgroup>
        <h1 className="text-2xl font-bold tracking-tight text-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </hgroup>
      {actions && <nav aria-label="Sayfa işlemleri" className="no-print flex flex-wrap gap-2">{actions}</nav>}
    </header>
  );
}

export function Card({ children, className, as: As = 'section', ...rest }: { children: ReactNode; className?: string; as?: 'section' | 'article' | 'aside' } & Record<string, unknown>) {
  return (
    <As className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)} {...rest}>
      {children}
    </As>
  );
}
