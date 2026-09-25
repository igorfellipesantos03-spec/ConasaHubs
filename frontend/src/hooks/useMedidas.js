import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Mede um elemento e reavalia a cada mudança de tamanho.
 *
 * A órbita da home é desenhada em pixels (linhas em SVG e nós posicionados por
 * ângulo), então porcentagem de CSS não resolve: é preciso saber o tamanho real
 * da área para calcular os raios da elipse.
 *
 * @returns {[Function, {largura: number, altura: number}]} a ref para o
 *   elemento e as medidas atuais.
 */
export function useMedidas() {
  const [medidas, setMedidas] = useState({ largura: 0, altura: 0 });
  const elemento = useRef(null);

  const referencia = useCallback((no) => {
    elemento.current = no;
    if (no) setMedidas({ largura: no.clientWidth, altura: no.clientHeight });
  }, []);

  useEffect(() => {
    const no = elemento.current;
    // O jsdom dos testes não traz ResizeObserver; sem ele a medida inicial já
    // serve, e nada quebra.
    if (!no || typeof ResizeObserver === 'undefined') return undefined;

    const observador = new ResizeObserver(() => {
      const largura = no.clientWidth;
      const altura = no.clientHeight;
      setMedidas((atual) =>
        atual.largura === largura && atual.altura === altura ? atual : { largura, altura },
      );
    });

    observador.observe(no);
    return () => observador.disconnect();
  }, []);

  return [referencia, medidas];
}
