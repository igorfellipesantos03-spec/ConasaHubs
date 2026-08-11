import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ message: 'Rota não encontrada.' });
}

// eslint-disable-next-line no-unused-vars -- o Express identifica o errorHandler pela aridade 4
export function errorHandler(error, req, res, next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Dados inválidos.',
      details: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (error instanceof AppError) {
    if (error.status >= 500) {
      logger.error({ err: error, path: req.originalUrl }, 'Falha de dependência externa');
    }
    return res.status(error.status).json({
      message: error.message,
      ...(error.code ? { code: error.code } : {}),
      ...(error.details ? { details: error.details } : {}),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Já existe um registro com esses dados.' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Recurso não encontrado.' });
    }
  }

  logger.error({ err: error, path: req.originalUrl }, 'Erro inesperado');
  return res.status(500).json({ message: 'Erro interno do servidor.' });
}
