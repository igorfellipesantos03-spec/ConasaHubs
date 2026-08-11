const VARIANTES = {
  primary:
    'bg-tech text-white hover:bg-tech-600 disabled:bg-tech/50 shadow-[0_1px_2px_rgba(15,44,89,0.16)]',
  institutional: 'bg-ink text-white hover:bg-ink-700 disabled:bg-ink/50',
  outline: 'border border-hairline bg-surface text-graphite hover:border-ink-300 hover:bg-ground',
  ghost: 'text-muted hover:bg-ground hover:text-graphite',
  danger: 'border border-danger/30 bg-surface text-danger hover:bg-danger/5',
};

const TAMANHOS = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
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
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed ${VARIANTES[variant]} ${TAMANHOS[size]} ${className}`}
      {...rest}
    />
  );
}
