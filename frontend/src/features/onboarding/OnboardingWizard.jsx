import { useState } from 'react';
import { ArrowRight, BadgeCheck, Building2, IdCard } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Field';
import { AvisoDeErro, Spinner } from '../../components/ui/Feedback';
import { Logo } from '../../components/ui/Logo';
import { EMPRESAS, FILIAL_PADRAO, exigeFilialManual } from '../../config/empresas';
import { apenasDigitos, cpfValido, formatarCpf } from '../../utils/cpf';
import { useConcluirCadastro } from '../../hooks/useOnboarding';
import { errorMessage } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const FORM_ID = 'cadastro-inicial';

/**
 * Cadastro inicial, mostrado uma única vez: a pessoa diz em qual empresa e
 * filial trabalha e informa o CPF; o resto (nome, setor, cargo) vem do
 * Protheus. É o que decide em qual hub ela entra — e, se for a primeira do
 * setor, o hub nasce com ela como curadora.
 */
export function OnboardingWizard() {
  const { atualizarUsuario } = useAuth();
  const concluir = useConcluirCadastro();

  const [etapa, setEtapa] = useState('empresa');
  const [empresaId, setEmpresaId] = useState(EMPRESAS[0].id);
  const [filialId, setFilialId] = useState(FILIAL_PADRAO);
  const [cpf, setCpf] = useState('');
  const [erro, setErro] = useState(null);
  // O usuário completo fica retido aqui até a pessoa fechar as boas-vindas:
  // entregá-lo ao contexto antes disso trocaria esta tela pelo portal, e o
  // recado sumiria antes de ser lido.
  const [cadastro, setCadastro] = useState(null);

  const filialManual = exigeFilialManual(empresaId);

  function escolherEmpresa(evento) {
    const id = evento.target.value;
    setEmpresaId(id);
    // Quem tem uma filial só não precisa digitá-la; quem tem várias, precisa.
    setFilialId(exigeFilialManual(id) ? '' : FILIAL_PADRAO);
  }

  function avancarParaCpf(evento) {
    evento.preventDefault();
    setErro(null);
    setEtapa('cpf');
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErro(null);
    setEtapa('carregando');

    try {
      const atualizado = await concluir.mutateAsync({
        companyId: empresaId,
        branchId: filialId,
        cpf: apenasDigitos(cpf),
      });

      setCadastro(atualizado);
      setEtapa('boas-vindas');
    } catch (falha) {
      setErro(
        errorMessage(falha, 'Não foi possível concluir seu cadastro. Tente novamente.'),
      );
      setEtapa('cpf');
    }
  }

  if (etapa === 'carregando') {
    return (
      <Modal open dispensavel={false} title="Buscando seu cadastro" onClose={() => {}}>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Spinner className="h-7 w-7 text-tech" />
          <p className="text-sm text-muted">
            Consultando seus dados no Protheus e preparando o seu setor.
          </p>
        </div>
      </Modal>
    );
  }

  if (etapa === 'boas-vindas') {
    return (
      <Modal open title="Tudo pronto" onClose={() => atualizarUsuario(cadastro)}>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <Logo className="h-14 w-14" arredondamento="rounded-2xl" />

          <div>
            <p className="text-[17px] font-bold text-ink">Bem-vindo ao CentralHub</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              O sistema interno da Conasa para você organizar e encontrar tudo o que usa no
              trabalho.
            </p>
          </div>

          <ResumoDoCadastro user={cadastro} />
        </div>
      </Modal>
    );
  }

  const naEtapaDaEmpresa = etapa === 'empresa';

  return (
    <Modal
      open
      dispensavel={false}
      onClose={() => {}}
      title={naEtapaDaEmpresa ? 'Onde você trabalha' : 'Seu CPF'}
      description={
        naEtapaDaEmpresa
          ? 'Precisamos saber a empresa e a filial para localizar seu cadastro no Protheus.'
          : 'É com ele que encontramos seu cadastro e definimos o seu setor.'
      }
      footer={
        naEtapaDaEmpresa ? (
          <Button type="submit" form={FORM_ID} disabled={!filialId.trim()}>
            Continuar <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setEtapa('empresa')}>
              Voltar
            </Button>
            <Button type="submit" form={FORM_ID} disabled={!cpfValido(cpf)}>
              Prosseguir <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        )
      }
    >
      <form id={FORM_ID} onSubmit={naEtapaDaEmpresa ? avancarParaCpf : enviar} noValidate>
        {erro && (
          <div className="mb-4">
            <AvisoDeErro>{erro}</AvisoDeErro>
          </div>
        )}

        {naEtapaDaEmpresa ? (
          <div className="space-y-4">
            <Passo icone={Building2} numero={1} de={2} titulo="Empresa e filial" />

            <Select label="Empresa" value={empresaId} onChange={escolherEmpresa}>
              {EMPRESAS.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.id} — {empresa.nome}
                </option>
              ))}
            </Select>

            {filialManual ? (
              <Input
                label="Filial"
                value={filialId}
                onChange={(evento) => setFilialId(apenasDigitos(evento.target.value).slice(0, 4))}
                placeholder="01"
                inputMode="numeric"
                autoFocus
                hint="Esta empresa tem mais de uma filial. Informe o código da sua."
              />
            ) : (
              <p className="text-[13px] text-muted">
                Filial <strong className="font-semibold text-graphite">{FILIAL_PADRAO}</strong>,
                a única desta empresa.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Passo icone={IdCard} numero={2} de={2} titulo="Identificação" />

            <Input
              label="CPF"
              value={cpf}
              onChange={(evento) => setCpf(formatarCpf(evento.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              hint="Só usamos o CPF para localizar seu cadastro no Protheus."
            />
          </div>
        )}
      </form>
    </Modal>
  );
}

function Passo({ icone: Icone, numero, de, titulo }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tech-50 text-tech">
        <Icone className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div>
        <p className="eyebrow">
          Passo {numero} de {de}
        </p>
        <p className="text-sm font-semibold text-graphite">{titulo}</p>
      </div>
    </div>
  );
}

/** Confirma o que foi encontrado: a pessoa vê que caiu no setor certo. */
function ResumoDoCadastro({ user }) {
  if (!user?.hubName) return null;

  const ehCurador = (user.curatorOf ?? []).includes(user.hubId);

  return (
    <div className="w-full rounded-control bg-ground px-4 py-3 text-left">
      <p className="flex items-center gap-2 text-sm font-semibold text-graphite">
        <BadgeCheck className="h-4 w-4 text-success" aria-hidden="true" />
        {user.hubName}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        {ehCurador
          ? 'Você é a primeira pessoa do seu setor por aqui, então ficou responsável por ele: pode renomeá-lo e organizar o conteúdo de todo mundo.'
          : 'Você já pode adicionar links e seções ao seu setor.'}
      </p>
    </div>
  );
}
