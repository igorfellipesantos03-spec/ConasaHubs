import { describe, it, expect } from 'vitest';
import { apenasDigitos, cpfValido, formatarCpf } from '../utils/cpf';

describe('formatarCpf', () => {
  it('aplica a máscara conforme a pessoa digita', () => {
    expect(formatarCpf('123')).toBe('123');
    expect(formatarCpf('1234')).toBe('123.4');
    expect(formatarCpf('1234567')).toBe('123.456.7');
    expect(formatarCpf('12345678910')).toBe('123.456.789-10');
  });

  it('ignora o que não for dígito e para nos 11', () => {
    expect(formatarCpf('abc123def456ghi789jk10extra')).toBe('123.456.789-10');
  });
});

describe('cpfValido', () => {
  it('aceita CPF com dígitos verificadores corretos, mascarado ou não', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('52998224725')).toBe(true);
  });

  it('recusa CPF com dígito verificador errado', () => {
    expect(cpfValido('529.982.247-24')).toBe(false);
  });

  it('recusa CPF incompleto', () => {
    expect(cpfValido('5299822472')).toBe(false);
  });

  it('recusa sequências repetidas, que passam na conta mas não existem', () => {
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('00000000000')).toBe(false);
  });

  it('recusa valor vazio', () => {
    expect(cpfValido('')).toBe(false);
    expect(cpfValido(null)).toBe(false);
  });
});

describe('apenasDigitos', () => {
  it('devolve só os números', () => {
    expect(apenasDigitos('123.456.789-10')).toBe('12345678910');
    expect(apenasDigitos(null)).toBe('');
  });
});
