import { useId } from 'react';

const CONTROLE =
  'w-full rounded-control border border-hairline bg-surface px-3.5 py-2.5 text-sm text-graphite transition-colors placeholder:text-muted/60 focus:border-tech focus:outline-none focus:ring-4 focus:ring-tech/10 disabled:bg-ground';

/**
 * Rótulo, controle e a linha de apoio (dica ou erro).
 *
 * O rótulo aponta para o controle por `htmlFor`, e a linha de apoio é ligada
 * por `aria-describedby`: assim o leitor de tela anuncia o nome do campo como
 * "CPF", e a explicação vem depois, em vez de virar parte do nome.
 *
 * Sem `id` — como nos grupos de cor e ícone do formulário de link — ele volta a
 * envolver o conteúdo, que é o certo para um conjunto de botões.
 */
export function Field({ id, apoioId, label, hint, error, children }) {
  const Rotulo = id ? 'label' : 'span';
  const apoio = error || hint;

  return (
    <div className="block">
      <Rotulo
        {...(id ? { htmlFor: id } : {})}
        className="mb-1.5 block text-[13px] font-semibold text-graphite"
      >
        {label}
      </Rotulo>

      {children}

      {apoio && (
        <span id={apoioId} className={`mt-1.5 block text-[13px] ${error ? 'text-danger-200' : 'text-muted'}`}>
          {apoio}
        </span>
      )}
    </div>
  );
}

/** Junta os identificadores que o controle precisa apontar em aria-describedby. */
function descricao(apoioId, temApoio) {
  return temApoio ? apoioId : undefined;
}

export function Input({ label, hint, error, className = '', ...rest }) {
  const id = useId();
  const apoioId = `${id}-apoio`;

  return (
    <Field id={id} apoioId={apoioId} label={label} hint={hint} error={error}>
      <input
        id={id}
        className={`${CONTROLE} ${error ? 'border-danger' : ''} ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={descricao(apoioId, Boolean(error || hint))}
        {...rest}
      />
    </Field>
  );
}

export function Textarea({ label, hint, error, className = '', ...rest }) {
  const id = useId();
  const apoioId = `${id}-apoio`;

  return (
    <Field id={id} apoioId={apoioId} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        className={`${CONTROLE} resize-none ${className}`}
        rows={2}
        aria-invalid={Boolean(error)}
        aria-describedby={descricao(apoioId, Boolean(error || hint))}
        {...rest}
      />
    </Field>
  );
}

export function Select({ label, hint, error, children, className = '', ...rest }) {
  const id = useId();
  const apoioId = `${id}-apoio`;

  return (
    <Field id={id} apoioId={apoioId} label={label} hint={hint} error={error}>
      <select
        id={id}
        className={`${CONTROLE} ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={descricao(apoioId, Boolean(error || hint))}
        {...rest}
      >
        {children}
      </select>
    </Field>
  );
}
