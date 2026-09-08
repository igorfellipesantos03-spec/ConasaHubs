import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, onSessionLost } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Ao abrir o app, pergunta ao backend quem está na sessão. Um 401 aqui é
    // esperado (ninguém logado) e não é erro de aplicação.
    api
      .get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => onSessionLost(() => setUser(null)), []);

  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  /** O cadastro inicial devolve o usuário já completo — não custa outra ida à API. */
  const atualizarUsuario = useCallback((atualizado) => setUser(atualizado), []);

  const value = useMemo(
    () => ({
      user,
      carregando,
      login,
      logout,
      atualizarUsuario,
      ehAdmin: user?.role === 'ADMIN',
      // Enquanto o cadastro não foi concluído não se sabe de que setor a pessoa
      // é — e o portal inteiro é organizado por setor.
      precisaCadastro: Boolean(user) && !user.onboardingCompleted,
      podeEditar: (hubId) =>
        user?.role === 'ADMIN' || (user?.curatorOf ?? []).includes(hubId),
    }),
    [user, carregando, login, logout, atualizarUsuario],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider.');
  return context;
}
