import { useEffect, useRef } from 'react';

/**
 * Constelação em canvas: pontos que vagam devagar e se ligam por uma linha
 * quando estão perto. Feito à mão em vez de uma biblioteca de partículas
 * porque são poucas linhas e o bundle do portal já é servido de dentro da
 * rede — não vale meia centena de KB por um plano de fundo.
 */
const DENSIDADE = 22000; // um ponto a cada ~22.000 px² de tela
const LIGACAO = 150; // distância máxima, em px, para desenhar a linha
const ALCANCE_DO_CURSOR = 170;
const VELOCIDADE = 14; // px por segundo
const MINIMO_DE_PONTOS = 24;
const MAXIMO_DE_PONTOS = 96;

function novoPonto(largura, altura) {
  const angulo = Math.random() * Math.PI * 2;

  return {
    x: Math.random() * largura,
    y: Math.random() * altura,
    vx: Math.cos(angulo) * VELOCIDADE,
    vy: Math.sin(angulo) * VELOCIDADE,
    raio: 1 + Math.random() * 1.6,
    opacidade: 0.15 + Math.random() * 0.4,
  };
}

export function FundoDeConstelacao({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const contexto = canvas?.getContext('2d');
    if (!contexto) return undefined;

    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cursor = { x: null, y: null };
    let pontos = [];
    let largura = 0;
    let altura = 0;
    let quadro = 0;
    let instanteAnterior = 0;

    function ajustar() {
      largura = canvas.clientWidth;
      altura = canvas.clientHeight;
      if (!largura || !altura) return;

      const proporcao = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(largura * proporcao);
      canvas.height = Math.round(altura * proporcao);
      contexto.setTransform(proporcao, 0, 0, proporcao, 0, 0);

      const alvo = Math.round(
        Math.min(Math.max((largura * altura) / DENSIDADE, MINIMO_DE_PONTOS), MAXIMO_DE_PONTOS),
      );

      // Ajusta a quantidade sem recriar os pontos: redimensionar a janela não
      // deve reembaralhar o desenho todo.
      while (pontos.length < alvo) pontos.push(novoPonto(largura, altura));
      pontos.length = Math.min(pontos.length, alvo);

      pintar();
    }

    function mover(intervalo) {
      for (const ponto of pontos) {
        ponto.x += ponto.vx * intervalo;
        ponto.y += ponto.vy * intervalo;

        // Quem sai por um lado volta pelo outro: a malha nunca esvazia.
        if (ponto.x < -20) ponto.x = largura + 20;
        else if (ponto.x > largura + 20) ponto.x = -20;
        if (ponto.y < -20) ponto.y = altura + 20;
        else if (ponto.y > altura + 20) ponto.y = -20;
      }
    }

    function linha(ax, ay, bx, by, cor) {
      contexto.strokeStyle = cor;
      contexto.lineWidth = 1;
      contexto.beginPath();
      contexto.moveTo(ax, ay);
      contexto.lineTo(bx, by);
      contexto.stroke();
    }

    function pintar() {
      contexto.clearRect(0, 0, largura, altura);

      for (let i = 0; i < pontos.length; i += 1) {
        const ponto = pontos[i];

        for (let j = i + 1; j < pontos.length; j += 1) {
          const outro = pontos[j];
          const distancia = Math.hypot(ponto.x - outro.x, ponto.y - outro.y);
          if (distancia > LIGACAO) continue;

          const forca = 0.26 * (1 - distancia / LIGACAO);
          linha(ponto.x, ponto.y, outro.x, outro.y, `rgba(185, 201, 222, ${forca})`);
        }

        if (cursor.x !== null) {
          const distancia = Math.hypot(ponto.x - cursor.x, ponto.y - cursor.y);
          if (distancia < ALCANCE_DO_CURSOR) {
            const forca = 0.5 * (1 - distancia / ALCANCE_DO_CURSOR);
            linha(ponto.x, ponto.y, cursor.x, cursor.y, `rgba(0, 168, 204, ${forca})`);
          }
        }

        contexto.fillStyle = `rgba(226, 240, 255, ${ponto.opacidade})`;
        contexto.beginPath();
        contexto.arc(ponto.x, ponto.y, ponto.raio, 0, Math.PI * 2);
        contexto.fill();
      }
    }

    function passo(instante) {
      const intervalo = instanteAnterior ? Math.min((instante - instanteAnterior) / 1000, 0.05) : 0;
      instanteAnterior = instante;

      mover(intervalo);
      pintar();
      quadro = requestAnimationFrame(passo);
    }

    function tocar() {
      if (quadro || semMovimento.matches) return;
      instanteAnterior = 0;
      quadro = requestAnimationFrame(passo);
    }

    function parar() {
      if (!quadro) return;
      cancelAnimationFrame(quadro);
      quadro = 0;
    }

    const aoMoverPonteiro = (evento) => {
      const area = canvas.getBoundingClientRect();
      cursor.x = evento.clientX - area.left;
      cursor.y = evento.clientY - area.top;
    };

    const aoSairComPonteiro = () => {
      cursor.x = null;
      cursor.y = null;
    };

    // Aba escondida não precisa de animação: economiza bateria do notebook.
    const aoTrocarDeAba = () => (document.hidden ? parar() : tocar());

    const aoTrocarPreferencia = () => {
      parar();
      if (semMovimento.matches) pintar();
      else tocar();
    };

    const observador = new ResizeObserver(ajustar);
    observador.observe(canvas);

    window.addEventListener('pointermove', aoMoverPonteiro, { passive: true });
    window.addEventListener('pointerleave', aoSairComPonteiro);
    document.addEventListener('visibilitychange', aoTrocarDeAba);
    semMovimento.addEventListener('change', aoTrocarPreferencia);

    ajustar();
    tocar();

    return () => {
      parar();
      observador.disconnect();
      window.removeEventListener('pointermove', aoMoverPonteiro);
      window.removeEventListener('pointerleave', aoSairComPonteiro);
      document.removeEventListener('visibilitychange', aoTrocarDeAba);
      semMovimento.removeEventListener('change', aoTrocarPreferencia);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={`block ${className}`} />;
}
