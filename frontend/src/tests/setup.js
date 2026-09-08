import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/* O jsdom não desenha em canvas e reclama alto no stderr a cada render do
   login. O fundo de constelação já sabe se virar sem contexto — só falta
   pedir sem levantar poeira. */
HTMLCanvasElement.prototype.getContext = () => null;

afterEach(cleanup);
