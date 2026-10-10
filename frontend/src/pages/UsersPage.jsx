import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck } from 'lucide-react';

export default function UsersPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h1 className="text-xl font-bold text-white">Staff & User Management</h1>
        <p className="text-xs text-slate-400 mt-1">Role: {user?.role}. Admin-only control panel for factory staff accounts.</p>
      </div>
    </div>
  );
}
