import { useId } from 'react';

const CONTROLE =
  'w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-graphite placeholder:text-muted/60 transition-colors focus:border-tech focus:outline-none disabled:bg-ground';

export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-graphite">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-sm text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-sm text-muted">{hint}</span>
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
