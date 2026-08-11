/**
 * O Express 4 não encaminha rejeições de promise para o errorHandler.
 * Todo handler assíncrono é embrulhado com este helper.
 */
export const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
