import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Factory,
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  Cpu,
  CheckCircle,
  Truck,
  Users,
  DollarSign,
  UserCheck,
  LogOut,
  Menu,
  X,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'accounts'] },
  { name: 'Raw Material Inventory', path: '/inventory', icon: Boxes, roles: ['admin', 'store_manager'] },
  { name: 'Customer Orders', path: '/orders', icon: ShoppingCart, roles: ['admin', 'store_manager'] },
  { name: 'Production & Fleet', path: '/production', icon: Cpu, roles: ['admin', 'production_operator'] },
  { name: 'Quality Inspection', path: '/quality', icon: CheckCircle, roles: ['admin', 'quality_inspector'] },
  { name: 'Finished Goods & Dispatch', path: '/dispatch', icon: Truck, roles: ['admin', 'store_manager'] },
  { name: 'Workers & Wages', path: '/workers', icon: Users, roles: ['admin', 'accounts'] },
  { name: 'Cost & Finance', path: '/finance', icon: DollarSign, roles: ['admin', 'accounts'] },
  { name: 'My Orders', path: '/my-orders', icon: ShoppingCart, roles: ['buyer'] },
  { name: 'User Management', path: '/users', icon: UserCheck, roles: ['admin'] },
];

const ROLE_BADGE_STYLES = {
  admin: 'bg-purple-900/60 text-purple-300 border-purple-700',
  store_manager: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
  production_operator: 'bg-amber-900/60 text-amber-300 border-amber-700',
  quality_inspector: 'bg-blue-900/60 text-blue-300 border-blue-700',
  accounts: 'bg-indigo-900/60 text-indigo-300 border-indigo-700',
  buyer: 'bg-teal-900/60 text-teal-300 border-teal-700',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const allowedNav = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));
  const badgeStyle = ROLE_BADGE_STYLES[user?.role] || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-slate-900 border-r border-slate-800/80 shrink-0">
        <div className="p-5 flex items-center gap-3 border-b border-slate-800/80">
          <div className="p-2 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-xl text-white shadow-md shadow-sky-600/20">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">Everest Textile</h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Mills Management</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {allowedNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-500 text-center">
          Prototype Mode (Simulated Data)
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="md:hidden flex items-center gap-2">
              <Factory className="w-5 h-5 text-sky-400" />
              <span className="font-bold text-sm text-white">Everest Mills</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 bg-slate-950/60 py-1.5 px-3 rounded-xl border border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-sky-950 border border-sky-800/80 text-sky-400 flex items-center justify-center font-bold text-xs uppercase">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-white leading-tight">{user?.full_name}</p>
                <p className="text-[10px] text-slate-400 font-mono leading-tight">{user?.email}</p>
              </div>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-medium ${badgeStyle}`}>
                {user?.role}
              </span>
            </div>

            <button
              id="logout-btn"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-rose-400 bg-slate-800 hover:bg-rose-950/40 border border-slate-700/80 hover:border-rose-800/80 transition"
              title="Logout from session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 p-3 space-y-1">
            {allowedNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      isActive ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800 text-slate-200'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        )}

        {/* View container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
