import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Sliders,
  CheckCircle,
  FileText,
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
  X
} from 'lucide-react';

const RESULT_STYLES = {
  passed: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    label: 'Passed (Grade A)',
  },
  rework: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: AlertTriangle,
    label: 'Rework Required',
  },
  rejected: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: XCircle,
    label: 'Rejected (Scrap)',
  },
  awaiting: {
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: Clock,
    label: 'Awaiting Check',
  },
};

export default function Quality() {
  const { user } = useAuth();

  const [rolls, setRolls] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inspection Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedRoll, setSelectedRoll] = useState(null);
  const [formResult, setFormResult] = useState('passed');
  const [formDefect, setFormDefect] = useState('none');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const canInspect = ['admin', 'quality_inspector'].includes(user?.role);

  const fetchQualityData = async () => {
    try {
      setLoading(true);
      const [rollsRes, statsRes] = await Promise.all([
        api.get('/quality/rolls'),
        api.get('/quality/stats'),
      ]);
      setRolls(rollsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load quality data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQualityData();
  }, []);

  const openInspectModal = (roll) => {
    setSelectedRoll(roll);
    setFormResult(roll.inspection_status === 'awaiting' ? 'passed' : roll.inspection_status);
    setFormDefect(roll.defect_category || 'none');
    setFormNotes(roll.notes || '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleInspectionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRoll) return;

    try {
      setSubmitting(true);
      setErrorMsg('');

      await api.post('/quality/inspections', {
        roll_id: selectedRoll.id,
        result: formResult,
        defect_category: formDefect,
        notes: formNotes,
      });

      setSuccessMsg(`Inspection recorded for roll ${selectedRoll.roll_number}: ${formResult.toUpperCase()}`);
      setShowModal(false);
      fetchQualityData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to submit inspection');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRolls = rolls.filter((r) => {
    const matchesFilter =
      filterStatus === 'all'
        ? true
        : filterStatus === 'awaiting'
        ? r.inspection_status === 'awaiting'
        : r.inspection_status === filterStatus;

    const matchesSearch =
      r.roll_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.fabric_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.machine_name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 tracking-wide uppercase">
              Quality Assurance
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">4-Point Grading System</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">Fabric Roll Inspection & Genealogy</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Four-point fabric inspection logging. Trace roll defects back to originating machine, batch, and yarn.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchQualityData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-navy' : ''}`} />
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2.5 text-xs font-medium shadow-sm">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Rolls</span>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{stats.total_rolls}</div>
            <div className="text-[11px] text-slate-400 mt-1">Serialized units</div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
            <span className="text-xs text-sky-700 font-semibold uppercase tracking-wider">Awaiting Check</span>
            <div className="text-2xl font-bold text-sky-700 mt-1 font-mono">{stats.pending_count}</div>
            <div className="text-[11px] text-slate-400 mt-1">Pending inspection</div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
            <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Passed (Grade A)</span>
            <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">{stats.passed_count}</div>
            <div className="text-[11px] text-slate-400 mt-1">Enrolled to finished goods</div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
            <span className="text-xs text-amber-700 font-semibold uppercase tracking-wider">Rework</span>
            <div className="text-2xl font-bold text-amber-700 mt-1 font-mono">{stats.rework_count}</div>
            <div className="text-[11px] text-slate-400 mt-1">Secondary processing</div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
            <span className="text-xs text-rose-600 font-semibold uppercase tracking-wider">Pass Rate</span>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{stats.pass_rate_pct}%</div>
            <div className="text-[11px] text-rose-600 font-medium mt-1">{stats.rejected_count} rejected</div>
          </div>
        </div>
      )}

      {/* Defect Distribution Mini-Cards */}
      {stats && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Defect Distribution Breakdown (Four-Point System)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(stats.defect_breakdown).map(([category, count]) => (
              <div key={category} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[11px] text-slate-500 font-semibold capitalize">
                  {category.replace('_', ' ')}
                </span>
                <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search roll, order, fabric, machine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['all', 'awaiting', 'passed', 'rework', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filterStatus === st
                  ? 'bg-primary-navy text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'awaiting' ? 'Awaiting Check' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Rolls Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-primary-navy" />
          </div>
        ) : filteredRolls.length === 0 ? (
          <div className="text-center py-16 text-slate-400 font-medium text-xs">
            No fabric rolls match your search or filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Roll Serial</th>
                  <th className="py-3.5 px-4">Order & Fabric</th>
                  <th className="py-3.5 px-4">Machine & Batch</th>
                  <th className="py-3.5 px-4">Length</th>
                  <th className="py-3.5 px-4">Inspection Result</th>
                  <th className="py-3.5 px-4">Defect Tag</th>
                  <th className="py-3.5 px-4">Finished Goods</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRolls.map((roll) => {
                  const style = RESULT_STYLES[roll.inspection_status] || RESULT_STYLES.awaiting;
                  const Icon = style.icon;

                  return (
                    <tr key={roll.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-primary-navy">
                        {roll.roll_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{roll.fabric_type}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{roll.order_number}</span>
                          <span>•</span>
                          <span>{roll.colour}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-800 font-semibold">{roll.machine_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{roll.batch_number}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        {roll.length_metres} <span className="font-sans font-normal text-slate-500">m</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${style.badge}`}>
                          <Icon className="w-3.5 h-3.5" />
                          <span className="capitalize">{roll.inspection_status}</span>
                        </span>
                        {roll.inspector_name && (
                          <div className="text-[11px] text-slate-400 mt-1">by {roll.inspector_name}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {roll.defect_category && roll.defect_category !== 'none' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 border border-rose-200 uppercase font-bold">
                            {roll.defect_category.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {roll.finished_good_status ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            roll.finished_good_status === 'available'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {roll.finished_good_status}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not enrolled</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {canInspect && (
                          <button
                            onClick={() => openInspectModal(roll)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-primary-navy hover:text-white text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
                          >
                            {roll.inspection_status === 'awaiting' ? 'Inspect' : 'Re-inspect'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Roll Modal */}
      {showModal && selectedRoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                  Roll Inspection Workstation
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Inspecting {selectedRoll.roll_number}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order {selectedRoll.order_number} • {selectedRoll.fabric_type} ({selectedRoll.length_metres}m)
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleInspectionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Inspection Verdict *
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'passed', label: 'Passed (Grade A)', activeStyle: 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-400/20' },
                    { id: 'rework', label: 'Rework Required', activeStyle: 'bg-amber-50 border-amber-400 text-amber-800 ring-2 ring-amber-400/20' },
                    { id: 'rejected', label: 'Rejected (Scrap)', activeStyle: 'bg-rose-50 border-rose-400 text-rose-800 ring-2 ring-rose-400/20' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormResult(opt.id)}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                        formResult === opt.id
                          ? opt.activeStyle
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Defect Category (Four-Point System)
                </label>
                <select
                  value={formDefect}
                  onChange={(e) => setFormDefect(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="none">None (Zero Defect)</option>
                  <option value="stain">Oil / Chemical Stain</option>
                  <option value="tear">Fabric Tear / Hole</option>
                  <option value="weave_flaw">Weave Flaw (Loose Warp/Weft)</option>
                  <option value="colour_variation">Colour Variation / Dye Bleed</option>
                  <option value="other">Other Mechanical Defect</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Inspector Notes & Remarks
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Minor weft loose thread trimmed at 40m mark. Overall uniform dye absorption."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  Confirm Inspection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
