import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth, getRoleLandingPath } from '../context/AuthContext';

export default function Unauthorized({ requiredRoles = [], userRole = '' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const landingPath = getRoleLandingPath(user?.role);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700/80 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-rose-950 text-rose-300 rounded-full border border-rose-800 uppercase tracking-wider">
          403 Access Denied
        </span>
        <h1 className="text-2xl font-bold text-white mt-4 mb-2">Not Authorised</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Your current account role <span className="font-semibold text-rose-400 uppercase">({userRole || user?.role || 'Guest'})</span> does not have permission to view this section.
        </p>
        
        {requiredRoles.length > 0 && (
          <div className="bg-slate-900/60 rounded-xl p-3 mb-6 text-xs text-slate-400 border border-slate-800">
            <span className="font-medium text-slate-300">Authorized roles: </span>
            {requiredRoles.join(', ')}
          </div>
        )}

        <button
          onClick={() => navigate(landingPath, { replace: true })}
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-xl transition shadow-lg shadow-sky-600/20 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Your Dashboard
        </button>
      </div>
    </div>
  );
}
