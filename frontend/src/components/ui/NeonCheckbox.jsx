/**
 * Checkbox neon: caixa desenhada à mão, com o traço do "check" correndo,
 * brilho e uma explosão curta de partículas ao marcar.
 *
 * O input de verdade continua aqui dentro — apenas transparente, por cima da
 * caixa — para o teclado, o leitor de tela e o autofill enxergarem um checkbox
 * comum. Some só a aparência padrão, nunca o controle.
 *
 * Vem sem rótulo de propósito: quem usa envolve o componente em um <label>
 * junto com o texto, e o clique no texto passa a valer também.
 * Os estilos moram no bloco "neon-checkbox" de src/styles/index.css.
 */
export function NeonCheckbox({ className = '', ...rest }) {
  return (
    <span className={`neon-checkbox ${className}`}>
      <input type="checkbox" {...rest} />

      <span className="neon-checkbox__frame" aria-hidden="true">
        <span className="neon-checkbox__box">
          <span className="neon-checkbox__check-container">
            <svg viewBox="0 0 24 24" className="neon-checkbox__check">
              <path d="M3,12.5l7,7L21,5" />
            </svg>
          </span>

          <span className="neon-checkbox__glow" />

          <span className="neon-checkbox__borders">
            <span />
            <span />
            <span />
            <span />
          </span>
        </span>

        <span className="neon-checkbox__effects">
          <span className="neon-checkbox__particles">
            {Array.from({ length: 12 }, (_, indice) => (
              <span key={indice} />
            ))}
          </span>

          <span className="neon-checkbox__rings">
            <span className="ring" />
            <span className="ring" />
            <span className="ring" />
          </span>

          <span className="neon-checkbox__sparks">
            <span />
            <span />
            <span />
            <span />
          </span>
        </span>
      </span>
    </span>
  );
}
