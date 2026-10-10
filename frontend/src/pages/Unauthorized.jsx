import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth, getRoleLandingPath } from '../context/AuthContext';

export default function Unauthorized({ requiredRoles = [], userRole = '' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const landingPath = getRoleLandingPath(user?.role);

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4 antialiased">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-xl shadow-slate-200/50 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-100">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-200 uppercase tracking-wider">
          403 Access Denied
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mt-4 mb-2">Not Authorised</h1>
        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          Your current account role <span className="font-semibold text-rose-600 uppercase">({userRole || user?.role || 'Guest'})</span> does not have permission to view this section.
        </p>
        
        {requiredRoles.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-3 mb-6 text-xs text-slate-600 border border-slate-200 text-left">
            <span className="font-semibold text-slate-700">Authorized roles: </span>
            <span className="font-mono text-teal-700">{requiredRoles.join(', ')}</span>
          </div>
        )}

        <button
          onClick={() => navigate(landingPath, { replace: true })}
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[#142B4A] hover:bg-[#203B5D] text-white font-semibold rounded-xl transition shadow-md shadow-[#142B4A]/20 text-sm"
        >
          <ArrowLeft className="w-4 h-4 text-teal-400" />
          Return to Your Portal
        </button>
      </div>
    </div>
  );
}
