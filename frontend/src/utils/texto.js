/**
 * Texto comparável para busca: sem acento e sem caixa, porque ninguém digita
 * "Operações" com o til quando está com pressa.
 */
export function normalizar(texto) {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

const RESERVA = '#c9eef7'; // --color-tech-100, quando não há cor utilizável
const LUMINANCIA_MINIMA = 0.18; // abaixo disto o tom some no fundo escuro
const CLAREZA_ALVO = 0.66; // para onde o tom é levado, em HSL
const SATURACAO_MAXIMA = 0.7; // acima disto o clarão vira neon

/**
 * A cor de um setor ou de um link sobre o fundo escuro do portal.
 *
 * O curador escolhe entre tons pensados para papel branco — o azul
 * institucional, um verde-garrafa, um vermelho fechado — e todos somem sobre o
 * quase-preto. Em vez de trocá-los por um azul único, o que apagaria o código
 * de cores, o tom é clareado mantendo o matiz: o vermelho continua vermelho, só
 * que legível. Quem já nasce claro o bastante passa intacto.
 *
 * A cor guardada no banco não muda — a conversão é só de exibição.
 */
export function corNoEscuro(cor) {
  const hexadecimal = /^#([0-9a-f]{6})$/i.exec(cor ?? '');
  if (!hexadecimal) return RESERVA;

  const valor = parseInt(hexadecimal[1], 16);
  const vermelho = ((valor >> 16) & 255) / 255;
  const verde = ((valor >> 8) & 255) / 255;
  const azul = (valor & 255) / 255;

  if (luminancia(vermelho, verde, azul) >= LUMINANCIA_MINIMA) return cor;

  const [matiz, saturacao] = paraHsl(vermelho, verde, azul);
  return deHsl(matiz, Math.min(saturacao, SATURACAO_MAXIMA), CLAREZA_ALVO);
}

/** Luminância relativa da WCAG: o quanto o olho enxerga daquela cor. */
function luminancia(vermelho, verde, azul) {
  const linear = (canal) =>
    canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;

  return 0.2126 * linear(vermelho) + 0.7152 * linear(verde) + 0.0722 * linear(azul);
}

/** @returns {[number, number, number]} matiz em voltas (0–1), saturação e clareza. */
function paraHsl(vermelho, verde, azul) {
  const maior = Math.max(vermelho, verde, azul);
  const menor = Math.min(vermelho, verde, azul);
  const amplitude = maior - menor;
  const clareza = (maior + menor) / 2;

  if (!amplitude) return [0, 0, clareza];

  const saturacao = amplitude / (1 - Math.abs(2 * clareza - 1));
  let matiz;

  if (maior === vermelho) matiz = ((verde - azul) / amplitude + 6) % 6;
  else if (maior === verde) matiz = (azul - vermelho) / amplitude + 2;
  else matiz = (vermelho - verde) / amplitude + 4;

  return [matiz / 6, saturacao, clareza];
}

function deHsl(matiz, saturacao, clareza) {
  const amplitude = (1 - Math.abs(2 * clareza - 1)) * saturacao;
  const base = clareza - amplitude / 2;

  const canal = (deslocamento) => {
    const posicao = (matiz * 6 + deslocamento) % 6;
    const pico = Math.max(0, Math.min(posicao, 4 - posicao, 1));
    return Math.round((base + amplitude * pico) * 255);
  };

  return `#${[canal(2), canal(0), canal(4)]
    .map((valor) => valor.toString(16).padStart(2, '0'))
    .join('')}`;
}
