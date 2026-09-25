import marca from '../../assets/conasa-256.webp';

/**
 * Marca da Conasa: as ondas são brancas, então o símbolo só se lê sobre fundo
 * escuro — daí ele vir sempre dentro de um bloco azul institucional.
 */
export function Logo({ className = 'h-9 w-9', arredondamento = 'rounded-xl' }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center bg-ink ${arredondamento} ${className}`}
    >
      <img src={marca} alt="" aria-hidden="true" className="h-[68%] w-[68%] object-contain" />
    </span>
  );
}

/**
 * Marca com o nome do produto ao lado, usada no cabeçalho. O portal é escuro
 * de ponta a ponta, então o nome é sempre branco — não há mais fundo claro
 * sobre o qual ele precisasse escurecer.
 */
export function LogoComNome({ className = '' }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Logo />
      <span className="text-[17px] font-extrabold tracking-tight text-white">
        Central<span className="text-tech">Hub</span>
      </span>
    </span>
  );
}

/**
 * A mesma marca em escala grande e opacidade baixa, como textura de fundo.
 * Decorativa: nunca carrega informação.
 */
export function MarcaDagua({ className = '' }) {
  return (
    <img
      src={marca}
      alt=""
      aria-hidden="true"
      className={`pointer-events-none select-none object-contain ${className}`}
    />
  );
}
