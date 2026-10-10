import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Cpu,
  PlusCircle,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  RefreshCw,
  Search,
  Loader2,
  Wrench,
  Activity,
  Calendar,
  AlertOctagon,
  X
} from 'lucide-react';

const MACHINE_STATUS_COLORS = {
  idle: 'bg-sky-50 text-sky-700 border-sky-200',
  running: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  maintenance: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function Production() {
  const { user } = useAuth();

  const [machines, setMachines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [delayedOrders, setDelayedOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddMachineModal, setShowAddMachineModal] = useState(false);
  const [showAssignBatchModal, setShowAssignBatchModal] = useState(false);
  const [showOutputModal, setShowOutputModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Form states
  const [newMachine, setNewMachine] = useState({ name: '', type: 'weaving', status: 'idle' });
  const [batchForm, setBatchForm] = useState({
    order_id: '',
    stage: 'weaving',
    machine_id: '',
    shift: 'morning',
  });
  const [outputForm, setOutputForm] = useState({
    output_metres: '',
    downtime_minutes: 0,
    create_fabric_rolls: true,
    mark_completed: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [matsRes, batRes, ordRes, delRes] = await Promise.all([
        api.get('/production/machines'),
        api.get('/production/batches'),
        api.get('/orders'),
        api.get('/production/delayed-orders'),
      ]);
      setMachines(matsRes.data);
      setBatches(batRes.data);
      setOrders(ordRes.data);
      setDelayedOrders(delRes.data);
    } catch (err) {
      console.error('Failed to load production fleet data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMachine = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api.post('/production/machines', newMachine);
      setShowAddMachineModal(false);
      setNewMachine({ name: '', type: 'weaving', status: 'idle' });
      setSuccessBanner('New machine added to fleet.');
      setTimeout(() => setSuccessBanner(''), 4000);
      await loadData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to register machine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignBatch = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const payload = {
        stage: batchForm.stage,
        machine_id: parseInt(batchForm.machine_id),
        shift: batchForm.shift,
      };
      if (batchForm.order_id) {
        payload.order_id = parseInt(batchForm.order_id);
      }
      await api.post('/production/batches', payload);
      setShowAssignBatchModal(false);
      setBatchForm({ order_id: '', stage: 'weaving', machine_id: '', shift: 'morning' });
      setSuccessBanner('Production batch created and machine dispatched to RUNNING.');
      setTimeout(() => setSuccessBanner(''), 4000);
      await loadData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordOutput = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api.post(`/production/batches/${selectedBatch.id}/output`, {
        output_metres: parseFloat(outputForm.output_metres),
        downtime_minutes: parseInt(outputForm.downtime_minutes) || 0,
        create_fabric_rolls: outputForm.create_fabric_rolls,
        mark_completed: outputForm.mark_completed,
      });
      setShowOutputModal(false);
      setOutputForm({ output_metres: '', downtime_minutes: 0, create_fabric_rolls: true, mark_completed: false });
      setSuccessBanner('Shift output and downtime logged. Fabric rolls serialized for quality inspection.');
      setTimeout(() => setSuccessBanner(''), 4000);
      await loadData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to record output');
    } finally {
      setSubmitting(false);
    }
  };

  const openOutputModalFor = (batch) => {
    setSelectedBatch(batch);
    setOutputForm({
      output_metres: '',
      downtime_minutes: 0,
      create_fabric_rolls: true,
      mark_completed: false,
    });
    setFormError('');
    setShowOutputModal(true);
  };

  const runningCount = machines.filter((m) => m.status === 'running').length;
  const idleCount = machines.filter((m) => m.status === 'idle').length;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 tracking-wide uppercase">
              Shop Floor & Fleet
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">Live Stage Dispatch</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">Production & Machine Fleet</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Replaces walking the factory floor. Assign orders to machines, track spinning/weaving/dyeing, and log downtime.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => loadData()}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 transition shadow-sm"
            title="Refresh Fleet"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-navy' : ''}`} />
          </button>
          <button
            onClick={() => setShowAssignBatchModal(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-navy hover:bg-secondary-navy text-white text-xs font-semibold shadow-sm transition"
          >
            <Play className="w-4 h-4 fill-white" />
            Assign Batch Run
          </button>
          <button
            onClick={() => setShowAddMachineModal(true)}
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
          >
            <PlusCircle className="w-4 h-4" />
            + Machine
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{successBanner}</span>
        </div>
      )}

      {/* Delayed Orders Warning */}
      {delayedOrders.filter((d) => d.is_delayed).length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-rose-100 text-rose-800">
              <AlertOctagon className="w-4 h-4 shrink-0" />
            </div>
            <h2 className="text-sm font-bold text-rose-950">
              Delayed & At-Risk Customer Orders Alert
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {delayedOrders
              .filter((d) => d.is_delayed)
              .map((d) => (
                <div
                  key={d.order_id}
                  className="bg-white border border-rose-200 rounded-xl p-3.5 text-xs shadow-xs"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-900 font-mono">{d.order_number}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                      {d.days_remaining < 0 ? `${Math.abs(d.days_remaining)}d Overdue` : `${d.days_remaining}d Left`}
                    </span>
                  </div>
                  <p className="text-slate-800 mt-1.5 font-medium">{d.fabric_type} <span className="text-slate-500">({d.colour})</span></p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Output: <span className="text-amber-700 font-bold">{d.produced_metres}m</span> / {d.ordered_metres}m
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Fleet Overview Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary-navy" />
            Machine Fleet Overview ({machines.length} Total | <span className="text-emerald-700">{runningCount} Running</span> | <span className="text-slate-500">{idleCount} Idle</span>)
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map((m) => {
            const badgeClass = MACHINE_STATUS_COLORS[m.status] || 'bg-slate-100 text-slate-700 border-slate-200';
            return (
              <div
                key={m.id}
                className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {m.type}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${badgeClass} flex items-center gap-1`}>
                      {m.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                      {m.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-3">{m.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Active Run:{' '}
                    {m.active_batch_number ? (
                      <span className="text-primary-navy font-mono font-bold">{m.active_batch_number}</span>
                    ) : (
                      <span className="text-slate-400 italic">No batch assigned (Standby)</span>
                    )}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">Machine ID: #{m.id}</span>
                  {m.status === 'idle' ? (
                    <button
                      onClick={() => {
                        setBatchForm({ ...batchForm, machine_id: m.id.toString(), stage: m.type });
                        setShowAssignBatchModal(true);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg border border-teal-200 transition"
                    >
                      Assign Job
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5" /> Working
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Production Batches Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary-navy" />
            Stage Batches & Shift Progress ({batches.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Batch Number</th>
                <th className="px-5 py-3.5">Order Number</th>
                <th className="px-5 py-3.5">Stage</th>
                <th className="px-5 py-3.5">Machine</th>
                <th className="px-5 py-3.5">Shift</th>
                <th className="px-5 py-3.5 text-right">Output Metres</th>
                <th className="px-5 py-3.5 text-right">Downtime (min)</th>
                <th className="px-5 py-3.5 text-center">Batch Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400 font-medium">
                    No production batches created yet. Click "Assign Batch Run" above.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-primary-navy">{b.batch_number}</td>
                    <td className="px-5 py-4 font-mono font-semibold text-teal-700">{b.order_number || 'N/A'}</td>
                    <td className="px-5 py-4 uppercase text-[10px] font-bold text-slate-600">
                      {b.stage}
                    </td>
                    <td className="px-5 py-4 text-slate-900 font-medium">{b.machine_name || 'Machine'}</td>
                    <td className="px-5 py-4 capitalize text-slate-500">{b.shift}</td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-slate-900">
                      {b.output_metres} m <span className="font-sans font-normal text-slate-400 text-[11px]">({b.fabric_rolls_count} rolls)</span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-semibold text-amber-700">
                      {b.downtime_minutes} m
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          b.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {b.status === 'in_progress' ? (
                        <button
                          onClick={() => openOutputModalFor(b)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold bg-primary-navy hover:bg-secondary-navy text-white rounded-lg shadow-xs transition"
                        >
                          Log Shift Output
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Assign Stage Batch */}
      {showAssignBatchModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Machine Scheduling</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">Assign Order to Machine Run</h3>
                <p className="text-xs text-slate-500 mt-0.5">Start a spinning, weaving, or dyeing production batch.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignBatchModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="m-6 mb-0 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleAssignBatch} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Production Stage *</label>
                    <select
                      value={batchForm.stage}
                      onChange={(e) => setBatchForm({ ...batchForm, stage: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="spinning">Spinning</option>
                      <option value="weaving">Weaving</option>
                      <option value="dyeing">Dyeing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Working Shift *</label>
                    <select
                      value={batchForm.shift}
                      onChange={(e) => setBatchForm({ ...batchForm, shift: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="morning">Morning Shift</option>
                      <option value="evening">Evening Shift</option>
                      <option value="night">Night Shift</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Production Machine *</label>
                  <select
                    required
                    value={batchForm.machine_id}
                    onChange={(e) => setBatchForm({ ...batchForm, machine_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">-- Select Machine Fleet --</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.type.toUpperCase()}) — [{m.status.toUpperCase()}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Auto-Assigned Routing:</span> Active order requirements will automatically allocate to this machine run and advance production status.
                </div>
              </div>

              <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-200 flex justify-end gap-3 rounded-b-2xl z-10 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAssignBatchModal(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-primary-navy hover:bg-secondary-navy text-white rounded-lg shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
                  id="submit-assign-batch-btn"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit & Dispatch Batch Run</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Log Output and Downtime */}
      {showOutputModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Shift Logging</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">Log Shift Output & Downtime</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Batch: <span className="font-mono text-primary-navy font-bold">{selectedBatch?.batch_number}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOutputModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="m-6 mb-0 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleRecordOutput} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fabric Metres Output *</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    placeholder="e.g. 200"
                    value={outputForm.output_metres}
                    onChange={(e) => setOutputForm({ ...outputForm, output_metres: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Machine Downtime (Minutes) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={outputForm.downtime_minutes}
                    onChange={(e) => setOutputForm({ ...outputForm, downtime_minutes: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={outputForm.create_fabric_rolls}
                      onChange={(e) => setOutputForm({ ...outputForm, create_fabric_rolls: e.target.checked })}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>Automatically generate serialized fabric rolls for quality inspection (100m units)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={outputForm.mark_completed}
                      onChange={(e) => setOutputForm({ ...outputForm, mark_completed: e.target.checked })}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>Mark batch as COMPLETED (frees machine back to IDLE)</span>
                  </label>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-200 flex justify-end gap-3 rounded-b-2xl z-10 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowOutputModal(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-primary-navy hover:bg-secondary-navy text-white rounded-lg shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
                  id="submit-output-btn"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Shift Output</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Add Machine */}
      {showAddMachineModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Fleet Setup</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">Add Machine to Fleet</h3>
                <p className="text-xs text-slate-500 mt-0.5">Register a spinning frame, weaving loom, or dyeing jigger.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMachineModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMachine} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Machine Identification Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spinning Frame SF-03, Rapier Loom RL-04"
                    value={newMachine.name}
                    onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Machine Process Type *</label>
                  <select
                    value={newMachine.type}
                    onChange={(e) => setNewMachine({ ...newMachine, type: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="spinning">Spinning</option>
                    <option value="weaving">Weaving</option>
                    <option value="dyeing">Dyeing</option>
                  </select>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-200 flex justify-end gap-3 rounded-b-2xl z-10 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddMachineModal(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-primary-navy hover:bg-secondary-navy text-white rounded-lg shadow-md transition disabled:opacity-50"
                  id="submit-add-machine-btn"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit & Add Machine</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
