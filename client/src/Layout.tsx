import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth';

const linkBase =
  'px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap';
const linkActive = 'bg-brand-600 text-white';
const linkInactive = 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">C</div>
            <span className="text-base font-semibold text-slate-900 hidden sm:inline">Clinic Scheduler</span>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {user?.role === 'manager' ? (
              <>
                <NavLink to="/dashboard" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
                  Coverage
                </NavLink>
                <NavLink to="/import" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
                  Import CSV
                </NavLink>
                <NavLink to="/import-report" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
                  Import Report
                </NavLink>
                <NavLink to="/staff" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
                  Staff
                </NavLink>
              </>
            ) : (
              <NavLink to="/my-shifts" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
                My Shifts
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-slate-900">{user?.name}</div>
              <div className="text-xs capitalize text-slate-500">
                {user?.role === 'manager' ? 'Manager' : user?.profession}
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
