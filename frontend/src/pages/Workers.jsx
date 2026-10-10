import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Users,
  UserPlus,
  CalendarCheck,
  Calculator,
  DollarSign,
  Search,
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  Check,
  X
} from 'lucide-react';

export default function Workers() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'attendance' | 'wages'
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [wages, setWages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showCalculateModal, setShowCalculateModal] = useState(false);

  // Form states
  const [newWorker, setNewWorker] = useState({
    full_name: '',
    employee_code: '',
    department: 'weaving',
    hourly_wage: 18.5,
  });

  const [attendanceForm, setAttendanceForm] = useState({
    worker_id: '',
    date: new Date().toISOString().split('T')[0],
    shift: 'morning',
    hours_worked: 8,
    status: 'present',
  });

  const [calculateForm, setCalculateForm] = useState({
    worker_id: '',
    period_start: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const canManagePayroll = ['admin', 'accounts'].includes(user?.role);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wRes, aRes, wgRes] = await Promise.all([
        api.get('/workers'),
        api.get('/workers/attendance'),
        api.get('/workers/wages'),
      ]);
      setWorkers(wRes.data);
      setAttendance(aRes.data);
      setWages(wgRes.data);
    } catch (err) {
      console.error('Failed to load workers data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWorker = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg('');

      const res = await api.post('/workers', newWorker);
      setSuccessMsg(`Worker ${res.data.full_name} (${res.data.employee_code}) enrolled successfully!`);
      setShowAddWorkerModal(false);
      setNewWorker({ full_name: '', employee_code: '', department: 'weaving', hourly_wage: 18.5 });
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to enroll worker');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogAttendance = async (e) => {
    e.preventDefault();
    if (!attendanceForm.worker_id) {
      setErrorMsg('Please select a worker');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      await api.post('/workers/attendance', {
        ...attendanceForm,
        worker_id: parseInt(attendanceForm.worker_id),
        date: new Date(attendanceForm.date).toISOString(),
      });

      setSuccessMsg('Attendance logged successfully!');
      setShowAttendanceModal(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to log attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCalculateWages = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg('');

      const payload = {
        period_start: new Date(calculateForm.period_start).toISOString(),
        period_end: new Date(calculateForm.period_end + 'T23:59:59').toISOString(),
      };
      if (calculateForm.worker_id) {
        payload.worker_id = parseInt(calculateForm.worker_id);
      }

      const res = await api.post('/workers/wages/calculate', payload);
      setSuccessMsg(`Calculated ${res.data.length} wage disbursement records!`);
      setShowCalculateModal(false);
      setActiveTab('wages');
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to calculate wages');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (wageId) => {
    try {
      await api.patch(`/workers/wages/${wageId}/pay`);
      setWages((prev) =>
        prev.map((w) => (w.id === wageId ? { ...w, is_paid: true } : w))
      );
      setSuccessMsg('Wage record marked as disbursed!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to disburse wage', err);
    }
  };

  const totalWagesSum = wages.reduce((acc, w) => acc + w.total_wage, 0);
  const unpaidWagesSum = wages.filter((w) => !w.is_paid).reduce((acc, w) => acc + w.total_wage, 0);

  const filteredWorkers = workers.filter((w) => {
    const q = searchQuery.toLowerCase();
    return (
      w.full_name.toLowerCase().includes(q) ||
      w.employee_code.toLowerCase().includes(q) ||
      w.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 tracking-wide uppercase">
              Human Resources & Payroll
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">Automated OT Calculation</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">Workers & Wage Ledger</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Factory worker roster, shift attendance registers, and automated overtime wage calculations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canManagePayroll && (
            <>
              <button
                onClick={() => {
                  setErrorMsg('');
                  setShowAddWorkerModal(true);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 border border-slate-200 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Enroll Worker</span>
              </button>

              <button
                onClick={() => {
                  setErrorMsg('');
                  setShowAttendanceModal(true);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 border border-slate-200 transition-colors"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Log Attendance</span>
              </button>

              <button
                onClick={() => {
                  setErrorMsg('');
                  setShowCalculateModal(true);
                }}
                className="px-3.5 py-2 bg-primary-navy hover:bg-secondary-navy text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Calculate Payroll</span>
              </button>
            </>
          )}

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-navy' : ''}`} />
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2.5 text-xs font-medium shadow-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Enrolled Workers</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{workers.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Spinning, weaving & dyeing</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-sky-700 font-semibold uppercase tracking-wider">Shifts Logged</span>
          <div className="text-2xl font-bold text-sky-700 mt-1 font-mono">{attendance.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Attendance records</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Total Wages</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">${totalWagesSum.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">{wages.length} wage slips</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-amber-700 font-semibold uppercase tracking-wider">Pending Disbursal</span>
          <div className="text-2xl font-bold text-amber-700 mt-1 font-mono">${unpaidWagesSum.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {wages.filter((w) => !w.is_paid).length} unpaid slips
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 transition-colors border-b-2 -mb-px ${
            activeTab === 'directory'
              ? 'border-primary-navy text-primary-navy'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Worker Roster ({workers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 transition-colors border-b-2 -mb-px ${
            activeTab === 'attendance'
              ? 'border-primary-navy text-primary-navy'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Attendance Register ({attendance.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('wages')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 transition-colors border-b-2 -mb-px ${
            activeTab === 'wages'
              ? 'border-primary-navy text-primary-navy'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Wage Register & Slips ({wages.length})</span>
        </button>
      </div>

      {/* TAB 1: WORKER ROSTER */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search worker, employee code, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-navy" />
              </div>
            ) : filteredWorkers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                No workers found. Click "Enroll Worker" above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Emp Code</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Hourly Rate</th>
                      <th className="py-3 px-4">Shifts Attended</th>
                      <th className="py-3 px-4 text-right">Lifetime Wages</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredWorkers.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-primary-navy">
                          {w.employee_code}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {w.full_name}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 capitalize border border-slate-200">
                            {w.department}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-800 font-medium">
                          ${w.hourly_wage.toFixed(2)} / hr
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {w.total_attendance_days} shift(s)
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 text-right">
                          ${w.total_wages_earned.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE REGISTER */}
      {activeTab === 'attendance' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-navy" />
            </div>
          ) : attendance.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No attendance records logged yet. Click "Log Attendance" above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Worker</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Shift</th>
                    <th className="py-3 px-4">Hours Worked</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {attendance.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                        {new Date(att.date).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {att.worker_name}{' '}
                        <span className="font-mono text-xs text-teal-700 font-normal">({att.employee_code})</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs capitalize text-slate-600">
                        {att.department}
                      </td>
                      <td className="py-3.5 px-4 capitalize font-medium text-slate-700">
                        {att.shift}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-900 font-bold">
                        {att.hours_worked} hrs
                        {att.hours_worked > 8 && (
                          <span className="ml-2 text-xs text-amber-700 font-semibold">
                            (+{att.hours_worked - 8}h OT)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            att.status === 'present'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WAGES REGISTER */}
      {activeTab === 'wages' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-navy" />
            </div>
          ) : wages.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No wage records generated yet. Click "Calculate Payroll" above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Worker</th>
                    <th className="py-3 px-4">Pay Period</th>
                    <th className="py-3 px-4">Regular Wages</th>
                    <th className="py-3 px-4">Overtime (1.5x)</th>
                    <th className="py-3 px-4">Total Net Wage</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {wages.map((wr) => (
                    <tr key={wr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{wr.worker_name}</div>
                        <div className="text-[11px] text-teal-700 font-mono mt-0.5">{wr.employee_code} • {wr.department}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-500">
                        {new Date(wr.period_start).toLocaleDateString()} - {new Date(wr.period_end).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        ${wr.regular_wages.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-amber-700 font-semibold">
                        ${wr.overtime_wages.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 text-base">
                        ${wr.total_wage.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            wr.is_paid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {wr.is_paid ? 'Disbursed' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {canManagePayroll && !wr.is_paid && (
                          <button
                            onClick={() => handleMarkPaid(wr.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 ml-auto shadow-xs transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Paid</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Enroll Worker Modal */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary-navy" />
                <span>Enroll Factory Worker</span>
              </h3>
              <button onClick={() => setShowAddWorkerModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateWorker} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newWorker.full_name}
                  onChange={(e) => setNewWorker({ ...newWorker, full_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WRK-1042"
                  value={newWorker.employee_code}
                  onChange={(e) => setNewWorker({ ...newWorker, employee_code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                <select
                  value={newWorker.department}
                  onChange={(e) => setNewWorker({ ...newWorker, department: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="spinning">Spinning</option>
                  <option value="weaving">Weaving</option>
                  <option value="dyeing">Dyeing & Finishing</option>
                  <option value="quality">Quality & Inspection</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hourly Wage Rate ($/hr) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={newWorker.hourly_wage}
                  onChange={(e) => setNewWorker({ ...newWorker, hourly_wage: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary-navy hover:bg-secondary-navy text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Enroll Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-primary-navy" />
                <span>Log Shift Attendance</span>
              </h3>
              <button onClick={() => setShowAttendanceModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogAttendance} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Worker *</label>
                <select
                  required
                  value={attendanceForm.worker_id}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, worker_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">-- Choose Worker --</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.full_name} ({w.employee_code} - {w.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={attendanceForm.date}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shift *</label>
                  <select
                    value={attendanceForm.shift}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, shift: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="morning">Morning Shift</option>
                    <option value="evening">Evening Shift</option>
                    <option value="night">Night Shift</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hours Worked *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    required
                    value={attendanceForm.hours_worked}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, hours_worked: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status *</label>
                  <select
                    value={attendanceForm.status}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAttendanceModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary-navy hover:bg-secondary-navy text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calculate Wages Modal */}
      {showCalculateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary-navy" />
                <span>Calculate Payroll Slips</span>
              </h3>
              <button onClick={() => setShowCalculateModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCalculateWages} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Worker (Optional - Leave blank for all workers)
                </label>
                <select
                  value={calculateForm.worker_id}
                  onChange={(e) => setCalculateForm({ ...calculateForm, worker_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">All Factory Workers</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.full_name} ({w.employee_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Period Start *</label>
                  <input
                    type="date"
                    required
                    value={calculateForm.period_start}
                    onChange={(e) => setCalculateForm({ ...calculateForm, period_start: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Period End *</label>
                  <input
                    type="date"
                    required
                    value={calculateForm.period_end}
                    onChange={(e) => setCalculateForm({ ...calculateForm, period_end: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                Overtime policy: Hours exceeding 8 hrs/shift are automatically credited at <strong className="text-slate-900">1.5x regular hourly wage</strong>.
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCalculateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary-navy hover:bg-secondary-navy text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Execute Calculation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
