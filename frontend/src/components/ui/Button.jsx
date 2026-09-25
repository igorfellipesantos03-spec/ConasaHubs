const VARIANTES = {
  primary: 'bg-tech text-white hover:bg-tech-600 disabled:bg-tech/40 shadow-soft',
  institutional: 'bg-ink text-white hover:bg-ink-800 disabled:bg-ink/40 shadow-soft',
  outline: 'bg-surface text-graphite shadow-soft hover:bg-raised',
  /* Sobre o azul do hero: vidro fosco em vez de um botão branco duro. */
  translucido:
    'bg-white/12 text-white ring-1 ring-inset ring-white/20 backdrop-blur-sm hover:bg-white/20',
  ghost: 'text-muted hover:bg-raised hover:text-graphite',
  danger: 'bg-danger text-white hover:bg-danger/90 shadow-soft',
};

const TAMANHOS = {
  sm: 'h-9 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-[15px] gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-control font-semibold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANTES[variant]} ${TAMANHOS[size]} ${className}`}
      {...rest}
    />
  );
}
