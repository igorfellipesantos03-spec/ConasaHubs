import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, LayoutGrid, Search, Settings, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePastas } from '../hooks/useFolders';
import { useHubs } from '../hooks/useHubs';
import { useMedidas } from '../hooks/useMedidas';
import { useSetorAtivo } from '../hooks/useSetorAtivo';
import { FundoDeConstelacao } from '../components/ui/FundoDeConstelacao';
import { Icon } from '../components/ui/Icon';
import { Logo } from '../components/ui/Logo';
import { Spinner } from '../components/ui/Feedback';
import { PainelDeSetores } from '../components/layout/PainelDeSetores';
import { SeletorDeSetor } from '../components/layout/SeletorDeSetor';
import { corNoEscuro, normalizar } from '../utils/texto';
import { errorMessage } from '../services/api';

/** Abaixo disto a elipse fica apertada demais e a lista serve melhor. */
const LARGURA_MINIMA_DA_ORBITA = 880;
const ALTURA_MINIMA_DA_ORBITA = 560;

const DIAMETRO_DO_NO = 92;
const LARGURA_DO_NO = 150;
/** Metade do nó mais o rótulo de duas linhas: o quanto ele avança para fora. */
const ESPACO_DO_ROTULO = 115;

/**
 * Home do CentralHub: as pastas da empresa em órbita ao redor da marca, sobre a
 * mesma constelação do login. É a primeira tela depois de entrar — a
 * continuidade do fundo faz o login e o portal parecerem um lugar só.
 *
 * A órbita mostra duas coisas de naturezas diferentes, e é por isso que o nó do
 * setor fica sempre no topo e sempre aceso: as pastas são o vocabulário comum
 * da empresa (Processos, Riscos, Gestão…), enquanto o setor é o endereço de
 * quem está olhando. Clicar numa pasta também leva ao setor da pessoa — só que
 * já apontando para os links que ela guardou ali.
 *
 * "O setor de quem está olhando" nem sempre é um só: gestores coordenam mais de
 * uma equipe e o admin responde por todas. Para eles a tela ganha um seletor no
 * canto, e é o setor escolhido ali que a órbita inteira passa a endereçar.
 */
export default function Inicio() {
  const { user, ehAdmin } = useAuth();
  const { data: pastas, isLoading, isError, error } = usePastas();
  const { data: hubs } = useHubs();
  const [painelAberto, setPainelAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [areaRef, area] = useMedidas();

  const meusSetores = setoresDaPessoa(user, hubs);
  const [setorAtivo, trocarDeSetor] = useSetorAtivo(meusSetores, user?.hubSlug);

  const nos = montarNos(setorAtivo, pastas ?? []);
  const termo = normalizar(busca);
  const combina = (no) => !termo || normalizar(`${no.titulo} ${no.descricao ?? ''}`).includes(termo);

  const cabeOrbita =
    area.largura >= LARGURA_MINIMA_DA_ORBITA && area.altura >= ALTURA_MINIMA_DA_ORBITA;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-night">
      <FundoDeConstelacao className="pointer-events-none absolute inset-0 h-full w-full" />
      <Halo />

      <Cabecalho
        user={user}
        busca={busca}
        aoBuscar={setBusca}
        aoAbrirPainel={() => setPainelAberto(true)}
      />

      <main ref={areaRef} className="relative min-h-0 flex-1">
        {/* Fora do fluxo, no canto de cima: a órbita ocupa a área inteira, e o
            seletor precisa flutuar sobre ela sem empurrar o centro da cena. */}
        <div className="absolute left-4 top-4 z-10 w-[230px] max-w-[calc(100%-2rem)] sm:left-6">
          <SeletorDeSetor setores={meusSetores} ativo={setorAtivo} aoTrocar={trocarDeSetor} />
        </div>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2.5 text-white/50">
            <Spinner /> <span className="text-sm">Montando a constelação de pastas…</span>
          </div>
        )}

        {isError && (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <p
              role="alert"
              className="flex max-w-md items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger/15 px-4 py-3 text-[13.5px] font-medium leading-relaxed text-red-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {errorMessage(error, 'Não foi possível carregar as pastas da tela inicial.')}
            </p>
          </div>
        )}

        {pastas && nos.length === 0 && <HomeVazia ehAdmin={ehAdmin} />}

        {pastas &&
          nos.length > 0 &&
          (cabeOrbita ? (
            <Orbita nos={nos} largura={area.largura} altura={area.altura} combina={combina} />
          ) : (
            <ListaDeNos nos={nos} combina={combina} />
          ))}
      </main>

      <Rodape setorAtivo={setorAtivo} ehAdmin={ehAdmin} />

      <PainelDeSetores aberto={painelAberto} aoFechar={() => setPainelAberto(false)} />
    </div>
  );
}

/**
 * Os setores que esta pessoa pode assumir na home.
 *
 * `canContribute` já é exatamente essa pergunta do lado do servidor — o setor
 * de origem mais os que a pessoa coordena, e todos eles para o administrador.
 * Reaproveitá-lo evita reescrever a regra de permissão aqui e deixá-la
 * divergir da que vale de verdade na hora de gravar.
 *
 * Enquanto a lista não chega, vale o setor que veio na sessão: sem isso o nó do
 * topo apareceria depois dos outros, e a cena montaria duas vezes.
 */
function setoresDaPessoa(user, hubs) {
  if (hubs) return hubs.filter((hub) => hub.canContribute);
  if (!user?.hubSlug) return [];
  return [
    {
      id: user.hubId,
      slug: user.hubSlug,
      name: user.hubName,
      icon: 'LayoutGrid',
      color: '#00A8CC',
      isMine: true,
      canContribute: true,
    },
  ];
}

/**
 * Traduz o setor ativo e as pastas nos nós da órbita.
 *
 * O nó do setor vem primeiro porque é o índice 0 que cai no topo da elipse, e é
 * lá que ele deve ficar: é o único nó que fala do dono da tela, não da empresa.
 *
 * Toda pasta leva ao setor ativo, com a pasta em destaque. Quem ainda não tem
 * setor resolvido cai na lista de setores — sem setor não existe página de
 * destino, e mandar para lugar nenhum seria pior que mandar escolher.
 */
function montarNos(setorAtivo, pastas) {
  const noDoSetor = setorAtivo
    ? [
        {
          chave: 'meu-setor',
          ehMeuSetor: true,
          titulo: setorAtivo.name,
          descricao: setorAtivo.isMine ? 'Seu setor' : 'Você coordena',
          icone: setorAtivo.icon ?? 'LayoutGrid',
          cor: '#00A8CC',
          imagem: null,
          destino: `/setor/${setorAtivo.slug}`,
        },
      ]
    : [];

  return [
    ...noDoSetor,
    ...pastas.map((pasta) => ({
      chave: pasta.id,
      ehMeuSetor: false,
      titulo: pasta.name,
      descricao: pasta.description,
      icone: pasta.icon,
      cor: pasta.color,
      imagem: pasta.image,
      destino: setorAtivo ? `/setor/${setorAtivo.slug}?pasta=${pasta.slug}` : '/setores',
    })),
  ];
}

/**
 * Clarão azul ao centro, o mesmo do login: descola a cena da malha de pontos
 * sem precisar de uma caixa opaca por trás.
 */
function Halo() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] max-w-none -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,168,204,0.13)_0%,rgba(15,44,89,0.35)_42%,transparent_70%)]"
    />
  );
}

function Cabecalho({ user, busca, aoBuscar, aoAbrirPainel }) {
  return (
    <header className="relative z-10 flex h-16 shrink-0 items-center gap-3 border-b border-ink-700/25 px-4 sm:px-6">
      {/* A marca é o botão do painel: é o único lugar da home que abre menu, e
          o desenho já convida ao clique. */}
      <button
        type="button"
        onClick={aoAbrirPainel}
        aria-label="Abrir o painel de setores"
        aria-haspopup="dialog"
        className="group -ml-1 flex items-center gap-2.5 rounded-2xl px-1 py-1 transition-colors hover:bg-white/[0.06]"
      >
        <Logo className="h-[34px] w-[34px] transition-transform duration-200 group-hover:scale-105" />
        <span className="text-[15px] font-extrabold tracking-tight text-white">
          Central<span className="text-tech">Hub</span>
        </span>
      </button>

      <span className="ml-3 hidden text-[12.5px] text-ink-400 lg:inline">
        Portal interno · Conasa
      </span>

      <div className="ml-auto hidden sm:block">
        <label className="flex w-[250px] items-center gap-2 rounded-xl border border-ink-700/40 bg-deep/70 px-3 py-2 transition-colors focus-within:border-tech/60 focus-within:bg-deep">
          <Search className="h-[15px] w-[15px] shrink-0 text-ink-400" aria-hidden="true" />
          <span className="sr-only">Buscar pasta</span>
          <input
            value={busca}
            onChange={(evento) => aoBuscar(evento.target.value)}
            placeholder="Buscar pasta"
            className="w-full bg-transparent text-[12.5px] text-white placeholder:text-ink-400 focus:outline-none"
          />
        </label>
      </div>

      <div className="ml-auto flex items-center gap-2.5 sm:ml-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tech/15 text-[12px] font-bold text-tech-100">
          {iniciais(user?.name)}
        </span>
        <span className="hidden leading-tight md:block">
          <span className="block text-[12.5px] font-semibold text-white/90">{user?.name}</span>
          <span className="block text-[11px] text-ink-400">{user?.hubName ?? 'Sem setor'}</span>
        </span>
      </div>
    </header>
  );
}

/**
 * A constelação. Os nós ficam em uma elipse — em vez de um círculo — porque a
 * tela é mais larga que alta: o círculo desperdiçaria as laterais e empurraria
 * os rótulos para fora em telas baixas.
 */
function Orbita({ nos, largura, altura, combina }) {
  const centroX = largura / 2;
  const centroY = altura / 2;

  // Os raios descontam o próprio nó (metade dele mais o rótulo), senão o nó de
  // baixo sai pela borda da tela em monitores curtos.
  const raioX = Math.min(largura / 2 - LARGURA_DO_NO / 2 - 20, 430);
  const raioY = Math.min(altura / 2 - ESPACO_DO_ROTULO, 280);

  // O disco cresce até onde couber sem tocar o nó mais próximo — descontando o
  // anel pontilhado (14px) e uma folga de respiro.
  const discoRaio = Math.max(85, Math.min(125, raioY - DIAMETRO_DO_NO / 2 - 32));

  const posicionados = nos.map((no, indice) => {
    // Começa no topo e segue em sentido horário, como um mostrador. Como o nó
    // do setor é o índice 0, é ele que ocupa o meio superior.
    const angulo = -Math.PI / 2 + (indice * 2 * Math.PI) / nos.length;
    const seno = Math.sin(angulo);

    return {
      no,
      x: centroX + Math.cos(angulo) * raioX,
      y: centroY + seno * raioY,
      // Rótulo sempre para fora do centro: no alto da órbita ele desceria em
      // cima do disco, e em tela baixa não há como afastar os dois.
      rotuloAcima: seno < -0.35,
      aceso: combina(no),
    };
  });

  const raios = posicionados.map((item) => `M${centroX},${centroY} L${item.x},${item.y}`).join(' ');
  const totalDePastas = nos.filter((no) => !no.ehMeuSetor).length;

  return (
    <>
      <svg width={largura} height={altura} aria-hidden="true" className="absolute inset-0">
        {/* Guias: a elipse da órbita e o polígono que liga os nós entre si. */}
        <ellipse
          cx={centroX}
          cy={centroY}
          rx={raioX}
          ry={raioY}
          fill="none"
          stroke="#1c4a86"
          strokeOpacity="0.3"
          strokeDasharray="3 7"
        />
        {posicionados.length > 2 && (
          <polygon
            points={posicionados.map((item) => `${item.x},${item.y}`).join(' ')}
            fill="none"
            stroke="#1c4a86"
            strokeOpacity="0.5"
          />
        )}

        <path d={raios} fill="none" stroke="#00a8cc" strokeOpacity="0.42" strokeWidth="1.4" />

        {/* O pulso que percorre cada raio: é o que faz a cena parecer viva sem
            pedir nada do usuário. */}
        <path
          d={raios}
          fill="none"
          stroke="#c9eef7"
          strokeOpacity="0.85"
          strokeWidth="1.6"
          strokeDasharray="14 146"
          className="animate-fluxo"
        />

        {posicionados.map((item) => (
          <circle
            key={item.no.chave}
            cx={centroX + (item.x - centroX) * 0.45}
            cy={centroY + (item.y - centroY) * 0.45}
            r="2.6"
            fill="#e2f0ff"
            opacity={item.aceso ? 1 : 0.25}
          />
        ))}
      </svg>

      <Centro tamanho={discoRaio * 2} total={totalDePastas} />

      {posicionados.map((item, indice) => (
        <NoDaOrbita
          key={item.no.chave}
          no={item.no}
          esquerda={item.x - LARGURA_DO_NO / 2}
          // Ancorar pela borda de baixo mantém o círculo centrado em `y`
          // mesmo com o rótulo crescendo para cima.
          topo={item.rotuloAcima ? undefined : item.y - DIAMETRO_DO_NO / 2}
          base={item.rotuloAcima ? altura - item.y - DIAMETRO_DO_NO / 2 : undefined}
          rotuloAcima={item.rotuloAcima}
          aceso={item.aceso}
          atraso={indice * 60}
        />
      ))}
    </>
  );
}

function Centro({ tamanho, total }) {
  // Em monitores baixos o disco encolhe para não encostar nos nós; a marca
  // encolhe junto, senão a palavra "CentralHub" transborda o círculo.
  const compacto = tamanho < 225;

  return (
    <div
      style={{ width: tamanho, height: tamanho }}
      className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-tech/30 bg-[radial-gradient(60%_60%_at_50%_38%,rgba(15,44,89,0.95),rgba(5,10,23,0.92))] px-4 text-center shadow-[0_0_60px_rgba(0,168,204,0.22),inset_0_0_60px_rgba(0,168,204,0.08)] ${
        compacto ? 'gap-2' : 'gap-2.5'
      }`}
    >
      <span
        aria-hidden="true"
        className="animate-girar absolute -inset-3.5 rounded-full border border-dashed border-tech/30"
      />

      <Logo
        className={`shadow-[0_0_24px_rgba(0,168,204,0.3)] ${compacto ? 'h-12 w-12' : 'h-14 w-14'}`}
        arredondamento="rounded-2xl"
      />

      <h1
        className={`font-extrabold leading-none tracking-tight text-white ${
          compacto ? 'text-[21px]' : 'text-[26px]'
        }`}
      >
        Central<span className="text-tech">Hub</span>
      </h1>

      <p className={`font-semibold text-ink-400 ${compacto ? 'text-[10.5px]' : 'text-[11.5px]'}`}>
        {total} {total === 1 ? 'pasta' : 'pastas'}
      </p>
    </div>
  );
}

/** O selo do nó: a imagem que o admin subiu ou, na falta dela, o ícone. */
function Selo({ no, tamanho }) {
  if (no.imagem) {
    return (
      <img
        src={no.imagem}
        alt=""
        aria-hidden="true"
        // Cantos arredondados para uma imagem quadrada não brigar com o círculo
        // do nó; imagem com fundo transparente não sente diferença.
        className="rounded-xl object-contain"
        style={{ width: tamanho, height: tamanho }}
      />
    );
  }

  return (
    <Icon
      name={no.icone}
      strokeWidth={1.6}
      style={{
        width: tamanho,
        height: tamanho,
        color: no.ehMeuSetor ? '#c9eef7' : corNoEscuro(no.cor),
      }}
      className=""
    />
  );
}

function NoDaOrbita({ no, esquerda, topo, base, rotuloAcima, aceso, atraso }) {
  // O setor fica aceso o tempo todo, sem depender de passar o mouse: é o nó
  // que responde "e eu, onde entro nisso?" — e essa resposta não pode custar
  // uma varredura pela órbita inteira.
  const circulo = no.ehMeuSetor
    ? 'border-tech/60 bg-deep shadow-[0_0_26px_rgba(0,168,204,0.35),inset_0_0_22px_rgba(0,168,204,0.14)] group-hover:shadow-[0_0_40px_rgba(0,168,204,0.5)]'
    : 'border-ink-400/45 bg-deep/95 shadow-[inset_0_0_18px_rgba(0,168,204,0.08)] group-hover:border-tech/60 group-hover:shadow-[0_0_28px_rgba(0,168,204,0.4)]';

  return (
    // A entrada fica na casca e o esmaecimento da busca no link: `animate-rise`
    // termina em `opacity: 1` com fill-mode `both`, e venceria a opacidade
    // aplicada no mesmo elemento.
    <div
      style={{
        left: esquerda,
        top: topo,
        bottom: base,
        width: LARGURA_DO_NO,
        animationDelay: `${atraso}ms`,
      }}
      className="animate-rise absolute"
    >
      <Link
        to={no.destino}
        style={{ opacity: aceso ? 1 : 0.28 }}
        className={`group flex ${
          rotuloAcima ? 'flex-col-reverse' : 'flex-col'
        } items-center gap-2.5 rounded-2xl text-center transition-[transform,opacity] duration-200 hover:-translate-y-1`}
      >
        <span
          style={{ width: DIAMETRO_DO_NO, height: DIAMETRO_DO_NO }}
          className={`flex items-center justify-center rounded-full border transition-all duration-200 ${circulo}`}
        >
          <Selo no={no} tamanho={no.imagem ? 52 : 32} />
        </span>

        <span className="flex flex-col gap-0.5">
          <span
            className={`flex items-center justify-center gap-1 text-[13.5px] font-bold leading-tight transition-colors ${
              no.ehMeuSetor ? 'text-tech-100' : 'text-white/90 group-hover:text-white'
            }`}
          >
            {no.titulo}
            <ArrowRight
              className="h-3.5 w-3.5 shrink-0 text-ink-400 transition-all group-hover:translate-x-0.5 group-hover:text-tech"
              aria-hidden="true"
            />
          </span>
          {no.descricao && (
            <span
              className={`line-clamp-2 text-[11px] leading-snug ${
                no.ehMeuSetor ? 'font-semibold text-tech/80' : 'text-ink-400'
              }`}
            >
              {no.descricao}
            </span>
          )}
        </span>
      </Link>
    </div>
  );
}

/**
 * Mesma informação sem a órbita, para telas estreitas. Não é uma versão pobre:
 * é o mesmo conteúdo em uma forma que cabe no celular.
 */
function ListaDeNos({ nos, combina }) {
  const totalDePastas = nos.filter((no) => !no.ehMeuSetor).length;

  return (
    <div className="absolute inset-0 overflow-y-auto px-5 py-8">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-1.5 text-center">
        <Logo className="h-14 w-14" arredondamento="rounded-2xl" />
        <h1 className="mt-1.5 text-[24px] font-extrabold tracking-tight text-white">
          Central<span className="text-tech">Hub</span>
        </h1>
        <p className="text-[12.5px] font-semibold text-ink-400">
          {totalDePastas} {totalDePastas === 1 ? 'pasta' : 'pastas'}
        </p>
      </div>

      <ul className="mx-auto mt-7 grid max-w-lg gap-2.5">
        {nos.filter(combina).map((no, indice) => (
          <li key={no.chave}>
            <Link
              to={no.destino}
              style={{ animationDelay: `${indice * 45}ms` }}
              className={`animate-rise group flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 transition-colors ${
                no.ehMeuSetor
                  ? 'border-tech/50 bg-tech/10 hover:bg-tech/15'
                  : 'border-white/10 bg-deep/70 hover:border-tech/40 hover:bg-deep'
              }`}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                  no.ehMeuSetor ? 'border-tech/40 bg-deep' : 'border-white/10 bg-night/60'
                }`}
              >
                <Selo no={no} tamanho={no.imagem ? 30 : 24} />
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[15px] font-bold ${
                    no.ehMeuSetor ? 'text-tech-100' : 'text-white'
                  }`}
                >
                  {no.titulo}
                </span>
                {no.descricao && (
                  <span
                    className={`block truncate text-[12px] ${
                      no.ehMeuSetor ? 'font-semibold text-tech/80' : 'text-ink-400'
                    }`}
                  >
                    {no.descricao}
                  </span>
                )}
              </span>

              <ArrowRight className="h-[18px] w-[18px] shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-tech" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Home sem nada para orbitar: nenhuma pasta cadastrada e nenhum setor resolvido
 * para esta pessoa. Para o admin é um convite com o caminho pronto; para os
 * demais, o recado de que os setores continuam ali ao lado.
 */
function HomeVazia({ ehAdmin }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo className="h-16 w-16" arredondamento="rounded-2xl" />
      <div>
        <p className="text-[19px] font-bold text-white">A tela inicial ainda está vazia</p>
        <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-ink-400">
          {ehAdmin
            ? 'Cadastre as pastas que organizam o trabalho da empresa — Processos, Riscos, Indicadores — e elas passam a orbitar a marca aqui.'
            : 'Enquanto a administração não define as pastas, os setores estão no painel que a marca abre, no canto superior esquerdo.'}
        </p>
      </div>
      {ehAdmin && (
        <Link
          to="/admin"
          className="mt-1 flex h-10 items-center gap-2 rounded-xl border border-tech/50 px-4 text-[13px] font-semibold text-tech-100 transition-colors hover:bg-tech/10"
        >
          <Settings className="h-4 w-4" />
          Cadastrar as pastas
        </Link>
      )}
    </div>
  );
}

function Rodape({ setorAtivo, ehAdmin }) {
  return (
    <footer className="relative z-10 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-4 sm:px-6">
      {ehAdmin && (
        <p className="hidden text-[11.5px] text-ink-400 sm:block">
          Estas pastas são definidas em{' '}
          <Link to="/admin" className="font-semibold text-tech-100 hover:text-tech">
            Administração › Pastas
          </Link>
          .
        </p>
      )}

      <div className="ml-auto flex items-center gap-2.5">
        {setorAtivo && (
          <BotaoDoRodape
            to={`/setor/${setorAtivo.slug}`}
            icone={<Icon name="LayoutGrid" className="h-[15px] w-[15px]" />}
            destaque
          >
            {setorAtivo.isMine ? 'Meu setor' : setorAtivo.name}
          </BotaoDoRodape>
        )}
        <BotaoDoRodape to="/favoritos" icone={<Star className="h-[15px] w-[15px]" />}>
          Meus favoritos
        </BotaoDoRodape>
        <BotaoDoRodape to="/setores" icone={<LayoutGrid className="h-[15px] w-[15px]" />}>
          Setores
        </BotaoDoRodape>
      </div>
    </footer>
  );
}

function BotaoDoRodape({ to, icone, destaque, children }) {
  return (
    <Link
      to={to}
      className={`flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-3 text-[12.5px] font-semibold transition-colors sm:px-3.5 ${
        destaque
          ? 'border-tech/50 text-tech-100 hover:bg-tech/10'
          : 'border-ink-700/40 text-ink-400 hover:border-ink-400/50 hover:text-white/80'
      }`}
    >
      {icone}
      {children}
    </Link>
  );
}

function iniciais(nome) {
  return (nome ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();
}
