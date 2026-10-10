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
  AlertOctagon
} from 'lucide-react';

const MACHINE_STATUS_COLORS = {
  idle: 'bg-slate-800 text-sky-400 border-sky-800',
  running: 'bg-emerald-950 text-emerald-400 border-emerald-800 animate-pulse',
  maintenance: 'bg-amber-950 text-amber-400 border-amber-800',
  error: 'bg-rose-950 text-rose-400 border-rose-800',
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
      await api.post('/production/batches', {
        order_id: parseInt(batchForm.order_id),
        stage: batchForm.stage,
        machine_id: parseInt(batchForm.machine_id),
        shift: batchForm.shift,
      });
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 uppercase tracking-wider">
              Shop Floor & Fleet
            </span>
            <span className="text-xs font-mono text-slate-500">Manual & Simulated Entry</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-2">Production & Machine Fleet</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Replaces walking the factory floor. Assign orders to machines, track spinning/weaving/dyeing, and log downtime.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => loadData()}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 transition"
            title="Refresh Fleet"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAssignBatchModal(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/25 transition"
          >
            <Play className="w-4 h-4" />
            Assign Batch Run
          </button>
          <button
            onClick={() => setShowAddMachineModal(true)}
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
          >
            <PlusCircle className="w-4 h-4" />
            + Machine
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Delayed Orders Warning */}
      {delayedOrders.filter((d) => d.is_delayed).length > 0 && (
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
            <h2 className="text-sm font-bold text-rose-300">
              Delayed & At-Risk Customer Orders Alert
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {delayedOrders
              .filter((d) => d.is_delayed)
              .map((d) => (
                <div
                  key={d.order_id}
                  className="bg-slate-900/90 border border-rose-800/50 rounded-xl p-3 text-xs"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white font-mono">{d.order_number}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-400 font-semibold border border-rose-800">
                      {d.days_remaining < 0 ? `${Math.abs(d.days_remaining)}d Overdue` : `${d.days_remaining}d Left`}
                    </span>
                  </div>
                  <p className="text-slate-300 mt-1 font-medium">{d.fabric_type} ({d.colour})</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Output: <span className="text-amber-400 font-bold">{d.produced_metres}m</span> / {d.ordered_metres}m
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Fleet Overview Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            Machine Fleet Overview ({machines.length} Total | {runningCount} Running | {idleCount} Idle)
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map((m) => {
            const badgeClass = MACHINE_STATUS_COLORS[m.status] || 'bg-slate-800 text-slate-300';
            return (
              <div
                key={m.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      {m.type}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
                      {m.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-3">{m.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Active Run:{' '}
                    {m.active_batch_number ? (
                      <span className="text-amber-400 font-mono font-semibold">{m.active_batch_number}</span>
                    ) : (
                      <span className="text-slate-500 italic">No batch running (Idle)</span>
                    )}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-mono text-[10px]">ID: #{m.id}</span>
                  {m.status === 'idle' ? (
                    <button
                      onClick={() => {
                        setBatchForm({ ...batchForm, machine_id: m.id.toString(), stage: m.type });
                        setShowAssignBatchModal(true);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-amber-600/80 hover:bg-amber-500 text-white rounded-lg transition"
                    >
                      Assign Job
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            Stage Batches & Shift Progress ({batches.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Batch Number</th>
                <th className="px-5 py-3">Order Number</th>
                <th className="px-5 py-3">Stage</th>
                <th className="px-5 py-3">Machine</th>
                <th className="px-5 py-3">Shift</th>
                <th className="px-5 py-3 text-right">Output Metres</th>
                <th className="px-5 py-3 text-right">Downtime (min)</th>
                <th className="px-5 py-3 text-center">Batch Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                    No production batches created yet. Click "Assign Batch Run" above.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-850/50 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-white">{b.batch_number}</td>
                    <td className="px-5 py-3.5 font-mono text-sky-400">{b.order_number || 'N/A'}</td>
                    <td className="px-5 py-3.5 uppercase text-[10px] font-semibold text-slate-300">
                      {b.stage}
                    </td>
                    <td className="px-5 py-3.5 text-white font-medium">{b.machine_name || 'Machine'}</td>
                    <td className="px-5 py-3.5 capitalize text-slate-400">{b.shift}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-white">
                      {b.output_metres} m ({b.fabric_rolls_count} rolls)
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-amber-400">
                      {b.downtime_minutes} m
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          b.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {b.status === 'in_progress' ? (
                        <button
                          onClick={() => openOutputModalFor(b)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition"
                        >
                          Log Shift Output
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Completed</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Assign Order to Machine Run</h3>
            <p className="text-xs text-slate-400 mb-4">Start a spinning, weaving, or dyeing production batch.</p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleAssignBatch} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Customer Order</label>
                <select
                  required
                  value={batchForm.order_id}
                  onChange={(e) => setBatchForm({ ...batchForm, order_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">-- Select Order --</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} — {o.fabric_type} ({o.quantity_metres}m)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Production Stage</label>
                  <select
                    value={batchForm.stage}
                    onChange={(e) => setBatchForm({ ...batchForm, stage: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="spinning">Spinning</option>
                    <option value="weaving">Weaving</option>
                    <option value="dyeing">Dyeing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Working Shift</label>
                  <select
                    value={batchForm.shift}
                    onChange={(e) => setBatchForm({ ...batchForm, shift: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="morning">Morning Shift</option>
                    <option value="evening">Evening Shift</option>
                    <option value="night">Night Shift</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assign Machine</label>
                <select
                  required
                  value={batchForm.machine_id}
                  onChange={(e) => setBatchForm({ ...batchForm, machine_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">-- Select Machine --</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.type.toUpperCase()}) — [{m.status.toUpperCase()}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignBatchModal(false)}
                  className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-lg flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Dispatch Batch Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Log Output and Downtime */}
      {showOutputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Log Shift Output & Machine Downtime</h3>
            <p className="text-xs text-slate-400 mb-4">
              Batch: <span className="font-mono text-amber-400 font-semibold">{selectedBatch?.batch_number}</span>
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleRecordOutput} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Fabric Metres Output</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  placeholder="e.g. 200"
                  value={outputForm.output_metres}
                  onChange={(e) => setOutputForm({ ...outputForm, output_metres: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Machine Downtime (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={outputForm.downtime_minutes}
                  onChange={(e) => setOutputForm({ ...outputForm, downtime_minutes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={outputForm.create_fabric_rolls}
                    onChange={(e) => setOutputForm({ ...outputForm, create_fabric_rolls: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Automatically generate serialized fabric rolls for quality inspection (100m units)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={outputForm.mark_completed}
                    onChange={(e) => setOutputForm({ ...outputForm, mark_completed: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Mark batch as COMPLETED (frees machine back to IDLE)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOutputModal(false)}
                  className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-lg flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Shift Output
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Add Machine */}
      {showAddMachineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Add Machine to Fleet</h3>
            <p className="text-xs text-slate-400 mb-4">Register a spinning frame, weaving loom, or dyeing jigger.</p>

            <form onSubmit={handleCreateMachine} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Machine Identification Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spinning Frame SF-03, Rapier Loom RL-04"
                  value={newMachine.name}
                  onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Machine Process Type</label>
                <select
                  value={newMachine.type}
                  onChange={(e) => setNewMachine({ ...newMachine, type: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="spinning">Spinning</option>
                  <option value="weaving">Weaving</option>
                  <option value="dyeing">Dyeing</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddMachineModal(false)}
                  className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-lg"
                >
                  Save Machine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
