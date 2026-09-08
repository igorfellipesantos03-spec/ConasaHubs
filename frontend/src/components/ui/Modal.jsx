import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Diálogo modal acessível: fecha no Esc e no clique fora, devolve o foco para
 * quem o abriu e prende o Tab dentro do conteúdo enquanto está aberto.
 *
 * `dispensavel={false}` tira as três saídas (X, Esc e clique fora) e serve para
 * etapas que não fazem sentido abandonar pela metade — o cadastro inicial, por
 * exemplo. O foco e a trava de rolagem continuam valendo.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dispensavel = true,
}) {
  const painel = useRef(null);
  const focoAnterior = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    focoAnterior.current = document.activeElement;
    const focavel = painel.current?.querySelector(
      'input, select, textarea, button:not([data-fechar])',
    );
    focavel?.focus();

    function aoTeclar(evento) {
      if (evento.key === 'Escape') {
        if (dispensavel) onClose();
        return;
      }
      if (evento.key !== 'Tab') return;

      const alvos = painel.current?.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!alvos?.length) return;

      const primeiro = alvos[0];
      const ultimo = alvos[alvos.length - 1];

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener('keydown', aoTeclar);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = '';
      focoAnterior.current?.focus?.();
    };
  }, [open, onClose, dispensavel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onMouseDown={(evento) =>
        dispensavel && evento.target === evento.currentTarget && onClose()
      }
    >
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-rise max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-surface shadow-lift sm:max-w-lg sm:rounded-card"
      >
        <header className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {dispensavel && (
            <button
              type="button"
              data-fechar
              onClick={onClose}
              aria-label="Fechar"
              className="-mr-1 rounded-lg p-1.5 text-muted transition-colors hover:bg-ground hover:text-graphite"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </header>

        <div className="px-5 py-4">{children}</div>

        {footer && (
          <footer className="flex justify-end gap-2 border-t border-hairline bg-ground/50 px-5 py-3.5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
