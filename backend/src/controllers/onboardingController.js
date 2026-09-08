import { onboardingSchema } from '../validators/onboardingValidators.js';
import { completeOnboarding } from '../services/onboardingService.js';
import { toPublicUser } from '../services/authService.js';
import { setSessionCookies } from '../services/sessionService.js';

export async function complete(req, res) {
  const dados = onboardingSchema.parse(req.body);

  const { user, curatorHubIds, session } = await completeOnboarding(req.user, dados, {
    ip: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  });

  // A sessão é reemitida com o hub e a curadoria novos: o cookie precisa
  // acompanhar, senão o usuário passaria os próximos 15 minutos sem permissão
  // no setor que acabou de ganhar.
  setSessionCookies(res, session);
  res.json({ user: toPublicUser(user, curatorHubIds) });
}
