import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import ProfileModal from './components/ProfileModal';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const linkBase =
    'px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap';
  const linkActive =
    'liquid-glass text-white shadow-sm border border-white/20';
  const linkInactive =
    'text-[hsl(var(--muted-foreground))] hover:text-white transition-colors';

  return (
    <div className="min-h-screen bg-[hsl(201_100%_13%)] text-white font-sans selection:bg-white/20 selection:text-white">
      {/* App Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[hsl(201_100%_13%)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(user?.role === 'manager' ? '/dashboard' : '/my-shifts')}
              className="flex items-center gap-2 text-left group cursor-pointer"
            >
              <div className="liquid-glass flex h-9 w-9 items-center justify-center rounded-full text-white font-bold text-base transition-transform group-hover:scale-105">
                V
              </div>
              <div>
                <span
                  className="text-xl tracking-tight text-white block leading-none"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  VeraCare<sup className="text-[10px]">®</sup>
                </span>
                <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-wider block">
                  Clinic Scheduler
                </span>
              </div>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1.5 overflow-x-auto py-1">
            {user?.role === 'manager' ? (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
                >
                  Coverage Board
                </NavLink>
                <NavLink
                  to="/import"
                  className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
                >
                  Import CSV
                </NavLink>
                <NavLink
                  to="/import-report"
                  className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
                >
                  Import Audit
                </NavLink>
                <NavLink
                  to="/staff"
                  className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
                >
                  Staff Directory
                </NavLink>
              </>
            ) : (
              <NavLink
                to="/my-shifts"
                className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
              >
                My Shift Portal
              </NavLink>
            )}
          </nav>

          {/* User Profile Pill & Logout */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProfileModal(true)}
              className="liquid-glass flex items-center gap-2.5 rounded-full px-3.5 py-1.5 border border-white/15 transition-all hover:scale-105 hover:border-white/30 cursor-pointer"
              title="Click to manage profile & settings"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 font-mono text-[11px] font-semibold text-white uppercase border border-white/20">
                {user?.name?.slice(0, 2) || 'US'}
              </div>
              <div className="hidden sm:block text-left pr-1">
                <div className="text-xs font-semibold text-white leading-tight">{user?.name}</div>
                <div className="text-[9px] font-mono capitalize text-emerald-400 leading-tight">
                  ⚙ Profile & Settings
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="liquid-glass rounded-full px-4 py-2 text-xs font-medium text-white transition-all hover:scale-105 hover:bg-white/10 cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>

      {/* Profile Settings Modal */}
      {showProfileModal && user && (
        <ProfileModal user={user} onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
}
