import React from 'react';
import { Sparkles } from 'lucide-react';

export const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@everest.test', password: 'Admin@123', role: 'admin', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  { label: 'Store Manager', email: 'store@everest.test', password: 'Store@123', role: 'store_manager', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'Production', email: 'production@everest.test', password: 'Prod@123', role: 'production_operator', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'Quality', email: 'quality@everest.test', password: 'Quality@123', role: 'quality_inspector', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  { label: 'Accounts', email: 'accounts@everest.test', password: 'Accounts@123', role: 'accounts', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { label: 'Buyer', email: 'buyer@everest.test', password: 'Buyer@123', role: 'buyer', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
];

export default function DemoAccountsHelper({ onSelectAccount }) {
  return (
    <div className="mt-6 pt-5 border-t border-slate-200">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-teal-600" />
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Demo Accounts (Evaluation Quick Fill)
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {DEMO_ACCOUNTS.map((acc) => (
          <button
            key={acc.email}
            type="button"
            onClick={() => onSelectAccount(acc.email, acc.password)}
            className="flex flex-col items-start p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50/50 border border-slate-200 hover:border-teal-500/50 transition-all text-left group shadow-xs"
          >
            <span className="text-xs font-semibold text-slate-900 group-hover:text-teal-700 transition">
              {acc.label}
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border mt-1 font-medium ${acc.badge}`}>
              {acc.role}
            </span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 mt-2.5 italic text-center">
        Click any role to autofill seeded credentials. Clearly marked demo data.
      </p>
    </div>
  );
}
