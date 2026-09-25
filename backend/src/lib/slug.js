/**
 * Transforma um nome em identificador de URL: "Gestão à vista" → "gestao-a-vista".
 *
 * Existe porque a pasta é referenciada na URL do setor (`?pasta=processos`) e
 * um nome com acento e espaço não sobrevive a um copiar-e-colar de link.
 */
export function slugify(texto) {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * O slug definitivo, garantidamente livre.
 *
 * `existe` responde se um candidato já está em uso — quem chama decide onde
 * procurar. Duas pastas podem ter o mesmo nome depois de uma renomeação, mas o
 * slug é único: o segundo vira "processos-2".
 */
export async function slugUnico(base, existe) {
  const raiz = slugify(base) || 'pasta';
  if (!(await existe(raiz))) return raiz;

  for (let sufixo = 2; sufixo < 100; sufixo += 1) {
    const candidato = `${raiz}-${sufixo}`;
    if (!(await existe(candidato))) return candidato;
  }

  return `${raiz}-${Date.now()}`;
}
