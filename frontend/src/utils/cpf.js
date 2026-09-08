export const apenasDigitos = (valor) => String(valor ?? '').replace(/\D/g, '');

/** Máscara progressiva: 000.000.000-00, aplicada conforme a pessoa digita. */
export function formatarCpf(valor) {
  const digitos = apenasDigitos(valor).slice(0, 11);

  return digitos
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

/**
 * Confere os dois dígitos verificadores. Vale a pena checar aqui: um CPF
 * digitado errado só voltaria como "não encontrado" depois de uma ida ao
 * Protheus, e o erro pareceria do sistema em vez do dedo.
 */
export function cpfValido(valor) {
  const digitos = apenasDigitos(valor);

  if (digitos.length !== 11) return false;
  // 111.111.111-11 e afins passam na conta, mas não existem.
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  return [9, 10].every((posicao) => digitos[posicao] === String(digitoVerificador(digitos, posicao)));
}

function digitoVerificador(digitos, posicao) {
  const soma = digitos
    .slice(0, posicao)
    .split('')
    .reduce((total, digito, indice) => total + Number(digito) * (posicao + 1 - indice), 0);

  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}
