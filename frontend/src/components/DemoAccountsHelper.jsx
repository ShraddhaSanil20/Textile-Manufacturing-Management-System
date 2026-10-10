import React from 'react';
import { Sparkles } from 'lucide-react';

export const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@everest.test', password: 'Admin@123', role: 'admin', badge: 'bg-purple-900/60 text-purple-300 border-purple-700' },
  { label: 'Store Manager', email: 'store@everest.test', password: 'Store@123', role: 'store_manager', badge: 'bg-emerald-900/60 text-emerald-300 border-emerald-700' },
  { label: 'Production', email: 'production@everest.test', password: 'Prod@123', role: 'production_operator', badge: 'bg-amber-900/60 text-amber-300 border-amber-700' },
  { label: 'Quality', email: 'quality@everest.test', password: 'Quality@123', role: 'quality_inspector', badge: 'bg-blue-900/60 text-blue-300 border-blue-700' },
  { label: 'Accounts', email: 'accounts@everest.test', password: 'Accounts@123', role: 'accounts', badge: 'bg-indigo-900/60 text-indigo-300 border-indigo-700' },
  { label: 'Buyer', email: 'buyer@everest.test', password: 'Buyer@123', role: 'buyer', badge: 'bg-teal-900/60 text-teal-300 border-teal-700' },
];

export default function DemoAccountsHelper({ onSelectAccount }) {
  return (
    <div className="mt-6 pt-5 border-t border-slate-700/60">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Demo Accounts (Evaluation Quick Fill)
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {DEMO_ACCOUNTS.map((acc) => (
          <button
            key={acc.email}
            type="button"
            onClick={() => onSelectAccount(acc.email, acc.password)}
            className="flex flex-col items-start p-2.5 rounded-lg bg-slate-900/70 hover:bg-slate-750 border border-slate-700/80 hover:border-sky-500/50 transition text-left group"
          >
            <span className="text-xs font-semibold text-white group-hover:text-sky-400 transition">
              {acc.label}
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border mt-1 ${acc.badge}`}>
              {acc.role}
            </span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 mt-2 italic text-center">
        Click any role to autofill seeded credentials. Clearly marked demo data.
      </p>
    </div>
  );
}
