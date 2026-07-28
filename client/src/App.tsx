import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyShifts from './pages/MyShifts';
import ImportPage from './pages/ImportPage';
import ImportReport from './pages/ImportReport';
import StaffPage from './pages/StaffPage';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-ink text-sm text-slate-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireManager({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (user?.role !== 'manager') return <Navigate to="/my-shifts" replace />;
  return children;
}

function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-ink text-sm text-slate-400">Loading…</div>;
  if (!user) return <Landing />;
  return <Navigate to={user.role === 'manager' ? '/dashboard' : '/my-shifts'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<RequireManager><Dashboard /></RequireManager>} />
        <Route path="/import" element={<RequireManager><ImportPage /></RequireManager>} />
        <Route path="/import-report" element={<RequireManager><ImportReport /></RequireManager>} />
        <Route path="/staff" element={<RequireManager><StaffPage /></RequireManager>} />
        <Route path="/my-shifts" element={<MyShifts />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
