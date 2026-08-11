// Ambiente determinístico para os testes: não depende do .env da máquina.
// `process.loadEnvFile` não sobrescreve variáveis já definidas, então o que
// está aqui prevalece sobre o arquivo local.
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/centralhub_test?schema=public';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres-ok';
process.env.ACCESS_TOKEN_TTL_MIN = '15';
process.env.REFRESH_TOKEN_TTL_HOURS = '8';
process.env.COOKIE_SECURE = 'false';
process.env.PROTHEUS_BASE_URL = 'https://protheus.teste.local';
process.env.PROTHEUS_TIMEOUT_MS = '5000';
process.env.PROTHEUS_DEFAULT_COMPANY = '07';
process.env.PROTHEUS_DEFAULT_BRANCH = '01';
process.env.ADMIN_USERNAMES = 'admin.ti';
