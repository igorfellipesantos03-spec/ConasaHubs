import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Icon } from '../ui/Icon';
import { corNoEscuro } from '../../utils/texto';

/**
 * Troca de setor na tela inicial.
 *
 * Só existe para quem tem mais de um setor — o gestor que coordena duas
 * equipes e o administrador, que responde por todas. Para quem tem um setor só
 * não há o que escolher, e um seletor de uma opção seria só ruído no canto da
 * tela.
 *
 * O que muda ao escolher é para onde a home aponta: o nó do topo, as pastas e o
 * botão "Meu setor". A identidade da pessoa no cadastro não se mexe.
 */
export function SeletorDeSetor({ setores, ativo, aoTrocar }) {
  const [aberto, setAberto] = useState(false);
  const caixaRef = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;

    function aoClicarFora(evento) {
      if (!caixaRef.current?.contains(evento.target)) setAberto(false);
    }
    function aoTeclar(evento) {
      if (evento.key === 'Escape') setAberto(false);
    }

    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  if (!ativo || setores.length < 2) return null;

  return (
    <div ref={caixaRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className="flex w-full items-center gap-2.5 rounded-2xl border border-tech/35 bg-deep/80 px-3 py-2.5 text-left transition-colors hover:border-tech/60 hover:bg-deep"
      >
        <Icon
          name={ativo.icon}
          className="h-[18px] w-[18px] shrink-0"
          style={{ color: corNoEscuro(ativo.color) }}
        />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
            Vendo como
          </span>
          <span className="block truncate text-[13px] font-bold text-white">{ativo.name}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${
            aberto ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {aberto && (
        <ul
          role="listbox"
          aria-label="Trocar de setor"
          className="animate-rise absolute left-0 top-full z-20 mt-1.5 max-h-[60vh] w-[min(320px,80vw)] overflow-y-auto rounded-2xl border border-ink-700/60 bg-deep p-1.5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)]"
        >
          {setores.map((setor) => {
            const selecionado = setor.slug === ativo.slug;
            return (
              <li key={setor.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selecionado}
                  onClick={() => {
                    aoTrocar(setor.slug);
                    setAberto(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                    selecionado ? 'bg-tech/15' : 'hover:bg-white/[0.06]'
                  }`}
                >
                  <Icon
                    name={setor.icon}
                    className="h-[17px] w-[17px] shrink-0"
                    style={{ color: corNoEscuro(setor.color) }}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[13px] font-semibold ${
                        selecionado ? 'text-tech-100' : 'text-white/90'
                      }`}
                    >
                      {setor.name}
                    </span>
                    <span className="block text-[11px] text-ink-400">
                      {setor.isMine ? 'Seu setor' : 'Você coordena'}
                    </span>
                  </span>
                  {selecionado && (
                    <Check className="h-4 w-4 shrink-0 text-tech" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
