import { useCallback, useState } from 'react';

const CHAVE = 'centralhub:setor-ativo';

/**
 * O setor que a pessoa está "vestindo" na tela inicial.
 *
 * Um gestor que coordena três setores não tem *um* setor: tem três, e a home
 * precisa saber para qual deles as pastas apontam. Isso é escolha de quem está
 * olhando, não identidade — por isso mora aqui e não no `hubId` do cadastro,
 * que continua sendo o setor de origem vindo do Protheus.
 *
 * A escolha fica no navegador de quem escolheu: é preferência de leitura, não
 * dado da empresa, e não faz sentido segui-la de máquina em máquina.
 */
export function useSetorAtivo(setores, slugDeOrigem) {
  const [escolhido, setEscolhido] = useState(ler);

  // A escolha é sempre reconferida contra a lista atual: se a coordenação de um
  // setor foi revogada, o que ficou guardado no navegador não pode continuar
  // valendo — a pessoa volta para o setor de origem sozinha.
  const ativo =
    setores.find((setor) => setor.slug === escolhido) ??
    setores.find((setor) => setor.slug === slugDeOrigem) ??
    setores[0] ??
    null;

  const trocar = useCallback((slug) => {
    gravar(slug);
    setEscolhido(slug);
  }, []);

  return [ativo, trocar];
}

// O acesso ao localStorage é protegido: em janela anônima e com cookies de site
// bloqueados o próprio acesso lança, e a home não pode cair por causa disso.
function ler() {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

function gravar(slug) {
  try {
    localStorage.setItem(CHAVE, slug);
  } catch {
    /* sem persistência: a escolha vale para esta visita, e está de bom tamanho */
  }
}
