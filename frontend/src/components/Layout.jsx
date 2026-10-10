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
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  store_manager: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  production_operator: 'bg-amber-50 text-amber-700 border-amber-200',
  quality_inspector: 'bg-sky-50 text-sky-700 border-sky-200',
  accounts: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  buyer: 'bg-teal-50 text-teal-700 border-teal-200',
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
  const badgeStyle = ROLE_BADGE_STYLES[user?.role] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col md:flex-row text-slate-800 antialiased">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-[#142B4A] border-r border-[#203B5D] shrink-0 text-slate-200 shadow-xl">
        <div className="p-5 flex items-center gap-3 border-b border-[#203B5D]">
          <div className="p-2.5 bg-gradient-to-tr from-teal-500 to-sky-500 rounded-xl text-white shadow-md shadow-teal-500/20">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              Everest Textile
            </h1>
            <p className="text-[10px] text-teal-300/80 font-medium tracking-wider uppercase">
              Operations ERP
            </p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto subtle-scroll">
          {allowedNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#203B5D] text-white shadow-sm font-semibold border-l-4 border-teal-400 pl-2.5'
                      : 'text-slate-300 hover:text-white hover:bg-[#203B5D]/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-teal-400/90" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#203B5D] text-[11px] text-slate-400 text-center font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
          Everest Mills • Live System
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="md:hidden flex items-center gap-2">
              <Factory className="w-5 h-5 text-teal-600" />
              <span className="font-bold text-sm text-[#142B4A]">Everest Mills</span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Textile Manufacturing Management System</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700 capitalize font-semibold">
                {user?.role?.replace('_', ' ')} Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-200/80">
              <div className="w-7 h-7 rounded-lg bg-[#142B4A] text-teal-300 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.full_name}</p>
                <p className="text-[10px] text-slate-500 font-mono leading-tight">{user?.email}</p>
              </div>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${badgeStyle}`}>
                {user?.role?.replace('_', ' ')}
              </span>
            </div>

            <button
              id="logout-btn"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition shadow-sm"
              title="Logout from session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#142B4A] border-b border-[#203B5D] p-3 space-y-1 shadow-lg text-slate-200">
            {allowedNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      isActive ? 'bg-[#203B5D] text-white font-semibold border-l-4 border-teal-400' : 'text-slate-300 hover:bg-[#203B5D]/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 text-teal-400" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        )}

        {/* View container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto subtle-scroll bg-[#F5F7FA]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
