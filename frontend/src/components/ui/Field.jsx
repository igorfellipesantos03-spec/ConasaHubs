import { useId } from 'react';

const CONTROLE =
  'w-full rounded-control border border-hairline bg-surface px-3.5 py-2.5 text-sm text-graphite transition-colors placeholder:text-muted/60 focus:border-tech focus:outline-none focus:ring-4 focus:ring-tech/10 disabled:bg-ground';

export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-graphite">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[13px] text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[13px] text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ label, hint, error, className = '', ...rest }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error}>
      <input
        id={id}
        className={`${CONTROLE} ${error ? 'border-danger' : ''} ${className}`}
        aria-invalid={Boolean(error)}
        {...rest}
      />
    </Field>
  );
}

export function Textarea({ label, hint, error, className = '', ...rest }) {
  return (
    <Field label={label} hint={hint} error={error}>
      <textarea className={`${CONTROLE} resize-none ${className}`} rows={2} {...rest} />
    </Field>
  );
}

export function Select({ label, hint, error, children, className = '', ...rest }) {
  return (
    <Field label={label} hint={hint} error={error}>
      <select className={`${CONTROLE} ${className}`} {...rest}>
        {children}
      </select>
    </Field>
  );
}
