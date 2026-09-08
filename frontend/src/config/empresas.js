/**
 * Empresas do grupo, com o código que o Protheus usa como `companyId`.
 * A ordem é a do cadastro no ERP — mudar aqui muda a ordem da lista na tela.
 */
export const EMPRESAS = [
  { id: '07', nome: 'Conasa Infraestrutura' },
  { id: '23', nome: 'Águas de Itapema' },
  { id: '24', nome: 'Águas de Santo Antônio' },
  { id: '25', nome: 'Sanesul' },
  { id: '26', nome: 'Luz de Belém' },
  { id: '27', nome: 'Sanesalto' },
  { id: '28', nome: 'Sanetrat' },
  { id: '29', nome: 'Conasa SPE' },
  { id: '31', nome: 'Urbeluz S.A.' },
  { id: '32', nome: 'Alegrete RJ' },
  { id: '33', nome: 'Caraguá Luz' },
  { id: '35', nome: 'Sanema' },
  { id: '36', nome: 'ASB' },
  { id: '37', nome: 'MT100' },
  { id: '38', nome: 'Urbeluz SCP Campos' },
  { id: '39', nome: 'Marabá Luz' },
  { id: '40', nome: 'MT320' },
  { id: '42', nome: 'MT246' },
  { id: '43', nome: 'BR163' },
  { id: '44', nome: 'Águas do Sertão' },
];

/**
 * Empresas com mais de uma filial: aqui a pessoa precisa digitar qual é a dela,
 * porque a consulta ao Protheus depende do par empresa+filial.
 */
export const EMPRESAS_COM_FILIAL_MANUAL = ['31', '43'];

/** Todas as demais operam numa filial só. */
export const FILIAL_PADRAO = '01';

export function exigeFilialManual(empresaId) {
  return EMPRESAS_COM_FILIAL_MANUAL.includes(empresaId);
}
