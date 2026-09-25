/**
 * Preparo da imagem de um atalho da home, no navegador.
 *
 * A imagem viaja embutida no JSON e é guardada no banco, então quem reduz é o
 * cliente: o admin escolhe a logo que tiver à mão — um PNG de 2 MB, um print —
 * e o que sai daqui é sempre um quadrado pequeno. Assim o servidor não precisa
 * de pasta de upload, de permissão de escrita nem de processamento de imagem.
 */

const LADO_MAXIMO = 256; // o nó da órbita tem 92px; 256 cobre telas retina
const TAMANHO_MAXIMO_DO_ARQUIVO = 12 * 1024 * 1024;
/** O mesmo teto do validador da API, com folga para o resto do formulário. */
const LIMITE_DA_API = 88_000;
/** Tentativas em ordem decrescente de capricho, até caber no limite. */
const TENTATIVAS = [
  { lado: LADO_MAXIMO, qualidade: 0.86 },
  { lado: LADO_MAXIMO, qualidade: 0.7 },
  { lado: 192, qualidade: 0.66 },
  { lado: 128, qualidade: 0.6 },
];

export class ImagemInvalida extends Error {}

export async function reduzirImagem(arquivo) {
  if (!arquivo.type.startsWith('image/')) {
    throw new ImagemInvalida('Escolha um arquivo de imagem (PNG, JPG, WebP ou SVG).');
  }
  if (arquivo.size > TAMANHO_MAXIMO_DO_ARQUIVO) {
    throw new ImagemInvalida('Imagem muito grande. Use um arquivo de até 12 MB.');
  }

  const original = await carregar(arquivo);

  for (const { lado, qualidade } of TENTATIVAS) {
    const dataUrl = desenhar(original, lado, qualidade);
    if (dataUrl.length <= LIMITE_DA_API) return dataUrl;
  }

  throw new ImagemInvalida(
    'Não foi possível reduzir esta imagem o bastante. Tente uma logo mais simples.',
  );
}

function carregar(arquivo) {
  return new Promise((resolve, reject) => {
    const endereco = URL.createObjectURL(arquivo);
    const imagem = new Image();

    // Um SVG entra aqui como qualquer outro: o canvas rasteriza, e o que sai é
    // um bitmap pequeno — sem precisar sanear marcação vinda de fora.
    imagem.onload = () => {
      URL.revokeObjectURL(endereco);
      if (!imagem.naturalWidth || !imagem.naturalHeight) {
        reject(new ImagemInvalida('Não foi possível ler esta imagem.'));
        return;
      }
      resolve(imagem);
    };

    imagem.onerror = () => {
      URL.revokeObjectURL(endereco);
      reject(new ImagemInvalida('Não foi possível ler esta imagem. Tente outro arquivo.'));
    };

    imagem.src = endereco;
  });
}

function desenhar(imagem, lado, qualidade) {
  const escala = Math.min(1, lado / Math.max(imagem.naturalWidth, imagem.naturalHeight));
  const largura = Math.max(1, Math.round(imagem.naturalWidth * escala));
  const altura = Math.max(1, Math.round(imagem.naturalHeight * escala));

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;

  const contexto = canvas.getContext('2d');
  contexto.imageSmoothingQuality = 'high';
  contexto.drawImage(imagem, 0, 0, largura, altura);

  // WebP guarda transparência e pesa menos; se o navegador não souber gravar,
  // ele devolve um PNG e o `toDataURL` avisa no próprio prefixo.
  const webp = canvas.toDataURL('image/webp', qualidade);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
}
