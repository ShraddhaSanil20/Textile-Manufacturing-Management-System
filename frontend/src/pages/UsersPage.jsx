import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, UserCheck, CheckCircle2 } from 'lucide-react';

export default function UsersPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 tracking-wide uppercase">
              System Administration
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">RBAC Security Controls</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">Staff & User Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Role: <span className="text-primary-navy font-bold uppercase">{user?.role}</span>. Administrator-only directory for factory personnel and role permissions.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-800">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>RBAC Active</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center mx-auto mb-3">
          <UserCheck className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Central Factory Identity Registry</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          System access is strictly enforced via JWT bearer tokens and database roles. All 6 personas (Administrator, Store Manager, Production Operator, Quality Inspector, Accounts Staff, and Buyer) operate under least-privilege security policies.
        </p>
      </div>
    </div>
  );
}
