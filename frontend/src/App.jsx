import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { CarregandoPagina } from './components/ui/Feedback';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Setores from './pages/Setores';
import HubPage from './pages/HubPage';
import Favoritos from './pages/Favoritos';
import Admin from './pages/Admin';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RotaProtegida />}>
        {/* A home tem cromo próprio — cabeçalho, órbita e painel — e ocupa a
            tela inteira no escuro do login. Por isso fica fora do AppShell. */}
        <Route path="/" element={<Inicio />} />

        <Route element={<ComAppShell />}>
          <Route path="/setores" element={<Setores />} />
          <Route path="/setor/:slug" element={<HubPage />} />
          <Route path="/favoritos" element={<Favoritos />} />
          <Route path="/admin" element={<SomenteAdmin />} />
          <Route path="*" element={<NaoEncontrado />} />
        </Route>
      </Route>
    </Routes>
  );
}

function RotaProtegida() {
  const { user, carregando, precisaCadastro } = useAuth();
  const location = useLocation();

  if (carregando) return <CarregandoPagina rotulo="Carregando o CentralHub" />;
  if (!user) return <Navigate to="/login" replace state={{ de: location.pathname }} />;

  // O portal se organiza por setor, e é o cadastro que diz qual é o da pessoa:
  // antes disso não há o que mostrar por baixo.
  if (precisaCadastro) return <OnboardingWizard />;

  return <Outlet />;
}

function ComAppShell() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function SomenteAdmin() {
  const { ehAdmin } = useAuth();
  return ehAdmin ? <Admin /> : <Navigate to="/" replace />;
}

function NaoEncontrado() {
  return (
    <div className="card px-6 py-12 text-center">
      <p className="eyebrow">Erro 404</p>
      <h1 className="mt-2 text-xl font-semibold text-white">Página não encontrada</h1>
      <p className="mt-1 text-muted">O endereço digitado não existe no CentralHub.</p>
    </div>
  );
}
