import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Icon } from './Icon';

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function CarregandoPagina({ rotulo = 'Carregando' }) {
  return (
    <div className="flex items-center gap-2 p-8 text-muted" role="status">
      <Spinner />
      <span className="text-sm">{rotulo}…</span>
    </div>
  );
}

/** Retângulos de carregamento com a mesma silhueta do card de link. */
export function EsqueletoDeCards({ quantidade = 6 }) {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))]">
      {Array.from({ length: quantidade }, (_, indice) => (
        <div key={indice} className="card flex h-[104px] items-start gap-3.5 p-4">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-ground" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-ground" />
            <div className="h-3 w-4/5 animate-pulse rounded-full bg-ground" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AvisoDeErro({ children }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-control bg-danger/8 px-3.5 py-3 text-sm font-medium text-danger"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

/** Tela vazia como convite à ação, nunca como beco sem saída. */
export function EstadoVazio({ icone = 'Link', titulo, descricao, acao }) {
  return (
    <div className="card flex flex-col items-center gap-3.5 px-6 py-14 text-center">
      <div className="rounded-2xl bg-tech-50 p-3.5 text-ink-400">
        <Icon name={icone} className="h-6 w-6" />
      </div>
      <div>
        <p className="font-medium text-graphite">{titulo}</p>
        {descricao && <p className="mt-1 text-sm text-muted">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [avisos, setAvisos] = useState([]);

  const avisar = useCallback((mensagem, tipo = 'success') => {
    const id = crypto.randomUUID();
    setAvisos((atuais) => [...atuais, { id, mensagem, tipo }]);
  }, []);

  const remover = useCallback((id) => {
    setAvisos((atuais) => atuais.filter((aviso) => aviso.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      sucesso: (mensagem) => avisar(mensagem, 'success'),
      erro: (mensagem) => avisar(mensagem, 'error'),
    }),
    [avisar],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4"
      >
        {avisos.map((aviso) => (
          <Aviso key={aviso.id} {...aviso} aoExpirar={() => remover(aviso.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Aviso({ mensagem, tipo, aoExpirar }) {
  useEffect(() => {
    const timer = setTimeout(aoExpirar, 4000);
    return () => clearTimeout(timer);
  }, [aoExpirar]);

  const ehErro = tipo === 'error';

  return (
    <div
      className={`animate-rise pointer-events-auto flex items-start gap-2 rounded-control px-4 py-3 text-sm font-medium text-white shadow-lift ${
        ehErro ? 'bg-danger' : 'bg-ink'
      }`}
    >
      {ehErro ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span>{mensagem}</span>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast precisa estar dentro de ToastProvider.');
  return context;
}
