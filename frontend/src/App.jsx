import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { CarregandoPagina } from './components/ui/Feedback';
import Login from './pages/Login';
import Setores from './pages/Setores';
import HubPage from './pages/HubPage';
import Favoritos from './pages/Favoritos';
import Admin from './pages/Admin';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<LayoutProtegido />}>
        <Route path="/" element={<Inicio />} />
        <Route path="/setores" element={<Setores />} />
        <Route path="/setor/:slug" element={<HubPage />} />
        <Route path="/favoritos" element={<Favoritos />} />
        <Route path="/admin" element={<SomenteAdmin />} />
        <Route path="*" element={<NaoEncontrado />} />
      </Route>
    </Routes>
  );
}

function LayoutProtegido() {
  const { user, carregando } = useAuth();
  const location = useLocation();

  if (carregando) return <CarregandoPagina rotulo="Carregando o CentralHub" />;
  if (!user) return <Navigate to="/login" replace state={{ de: location.pathname }} />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

/**
 * Quem tem setor cai direto nos links do próprio setor — a home não é um menu
 * para chegar onde a pessoa já sabe que quer ir.
 */
function Inicio() {
  const { user } = useAuth();
  return <Navigate to={user?.hubSlug ? `/setor/${user.hubSlug}` : '/setores'} replace />;
}

function SomenteAdmin() {
  const { ehAdmin } = useAuth();
  return ehAdmin ? <Admin /> : <Navigate to="/" replace />;
}

function NaoEncontrado() {
  return (
    <div className="card px-6 py-12 text-center">
      <p className="eyebrow">Erro 404</p>
      <h1 className="mt-2 text-xl font-semibold text-ink">Página não encontrada</h1>
      <p className="mt-1 text-muted">O endereço digitado não existe no CentralHub.</p>
    </div>
  );
}
