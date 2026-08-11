import pino from 'pino';
import { env, isProduction, isTest } from '../config/env.js';

export const logger = pino({
  level: isTest ? 'silent' : isProduction ? 'info' : 'debug',
  base: { service: 'centralhub-api', env: env.NODE_ENV },
  // Nunca deixar credencial ou token cair no log.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      '*.password',
      'access_token',
      '*.access_token',
    ],
    censor: '[redacted]',
  },
  transport: isProduction || isTest ? undefined : { target: 'pino-pretty', options: { colorize: true } },
});
