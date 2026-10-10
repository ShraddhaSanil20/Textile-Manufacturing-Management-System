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
  ArrowRight
} from 'lucide-react';

const RESULT_STYLES = {
  passed: {
    badge: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    icon: CheckCircle2,
    label: 'Passed (Grade A)',
  },
  rework: {
    badge: 'bg-amber-950 text-amber-400 border-amber-800',
    icon: AlertTriangle,
    label: 'Rework Required',
  },
  rejected: {
    badge: 'bg-rose-950 text-rose-400 border-rose-800',
    icon: XCircle,
    label: 'Rejected (Scrap)',
  },
  awaiting: {
    badge: 'bg-sky-950 text-sky-400 border-sky-800',
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
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 uppercase tracking-wider">
            Quality Control Workstation
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-2">Fabric Roll Inspection & Genealogy</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Four-point fabric inspection logging. Trace roll defects back to originating machine, batch, and yarn.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchQualityData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl flex items-center gap-2 text-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-400 font-medium">Total Rolls</span>
            <div className="text-2xl font-bold text-white mt-1">{stats.total_rolls}</div>
            <div className="text-[11px] text-slate-500 mt-1">Serialized units</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-sky-400 font-medium">Awaiting Check</span>
            <div className="text-2xl font-bold text-sky-400 mt-1">{stats.pending_count}</div>
            <div className="text-[11px] text-slate-500 mt-1">Pending inspection</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-emerald-400 font-medium">Passed (Grade A)</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.passed_count}</div>
            <div className="text-[11px] text-slate-500 mt-1">Enrolled to finished goods</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-amber-400 font-medium">Rework</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{stats.rework_count}</div>
            <div className="text-[11px] text-slate-500 mt-1">Secondary processing</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-rose-400 font-medium">Pass Rate</span>
            <div className="text-2xl font-bold text-white mt-1">{stats.pass_rate_pct}%</div>
            <div className="text-[11px] text-rose-400 mt-1">{stats.rejected_count} rejected</div>
          </div>
        </div>
      )}

      {/* Defect Distribution Mini-Bar */}
      {stats && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Defect Distribution Breakdown
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(stats.defect_breakdown).map(([category, count]) => (
              <div key={category} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 capitalize">
                  {category.replace('_', ' ')}
                </span>
                <div className="text-lg font-bold text-white mt-0.5">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search roll, order, fabric, machine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['all', 'awaiting', 'passed', 'rework', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors ${
                filterStatus === st
                  ? 'bg-sky-500 text-white font-semibold'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st === 'awaiting' ? 'Awaiting' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Rolls Table / Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          </div>
        ) : filteredRolls.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            No fabric rolls match your search or filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Roll Serial</th>
                  <th className="py-3 px-4">Order & Fabric</th>
                  <th className="py-3 px-4">Machine & Batch</th>
                  <th className="py-3 px-4">Length</th>
                  <th className="py-3 px-4">Inspection Result</th>
                  <th className="py-3 px-4">Defect Tag</th>
                  <th className="py-3 px-4">Finished Goods</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredRolls.map((roll) => {
                  const style = RESULT_STYLES[roll.inspection_status] || RESULT_STYLES.awaiting;
                  const Icon = style.icon;

                  return (
                    <tr key={roll.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {roll.roll_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white">{roll.fabric_type}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{roll.order_number}</span>
                          <span>•</span>
                          <span>{roll.colour}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-sky-400 font-medium">{roll.machine_name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{roll.batch_number}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white">
                        {roll.length_metres} m
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style.badge}`}>
                          <Icon className="w-3.5 h-3.5" />
                          <span className="capitalize">{roll.inspection_status}</span>
                        </span>
                        {roll.inspector_name && (
                          <div className="text-[11px] text-slate-500 mt-1">by {roll.inspector_name}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {roll.defect_category && roll.defect_category !== 'none' ? (
                          <span className="px-2 py-0.5 rounded text-xs bg-rose-950 text-rose-300 border border-rose-800 uppercase font-semibold">
                            {roll.defect_category.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {roll.finished_good_status ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                            roll.finished_good_status === 'available'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {roll.finished_good_status}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Not enrolled</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {canInspect && (
                          <button
                            onClick={() => openInspectModal(roll)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors border border-slate-700"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                  Roll Inspection Workstation
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  Inspecting {selectedRoll.roll_number}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Order {selectedRoll.order_number} • {selectedRoll.fabric_type} ({selectedRoll.length_metres}m)
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-300 rounded-xl text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleInspectionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Inspection Verdict *
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'passed', label: 'Passed (Grade A)', color: 'border-emerald-700 hover:bg-emerald-950/40 text-emerald-400' },
                    { id: 'rework', label: 'Rework Required', color: 'border-amber-700 hover:bg-amber-950/40 text-amber-400' },
                    { id: 'rejected', label: 'Rejected (Scrap)', color: 'border-rose-700 hover:bg-rose-950/40 text-rose-400' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormResult(opt.id)}
                      className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                        formResult === opt.id
                          ? 'bg-slate-800 border-sky-400 ring-2 ring-sky-400/30 font-bold'
                          : `bg-slate-950 ${opt.color}`
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Defect Category (Four-Point System)
                </label>
                <select
                  value={formDefect}
                  onChange={(e) => setFormDefect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
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
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Inspector Notes & Remarks
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Minor weft loose thread trimmed at 40m mark. Overall uniform dye absorption."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 placeholder-slate-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-sky-500/20"
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
