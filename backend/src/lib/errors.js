/**
 * Erro de aplicação com status HTTP e mensagem já pronta para o usuário final.
 * Qualquer erro que NÃO seja um AppError é tratado como falha inesperada pelo
 * errorHandler e vira um 500 genérico, sem vazar detalhes internos.
 */
export class AppError extends Error {
  constructor(status, message, options = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = options.code;
    this.details = options.details;
    if (options.cause) this.cause = options.cause;
  }
}

export const badRequest = (message, options) => new AppError(400, message, options);
export const unauthorized = (message = 'Sessão expirada. Faça login novamente.', options) =>
  new AppError(401, message, options);
export const forbidden = (message = 'Você não tem permissão para esta ação.', options) =>
  new AppError(403, message, options);
export const notFound = (message = 'Recurso não encontrado.', options) =>
  new AppError(404, message, options);
export const conflict = (message, options) => new AppError(409, message, options);
export const badGateway = (message, options) => new AppError(502, message, options);
