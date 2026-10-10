import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Package,
  PlusCircle,
  Truck,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  RefreshCw,
  Loader2,
  Building,
  Calendar,
  DollarSign,
  ChevronRight,
  FileText
} from 'lucide-react';

const STAGE_STEPS = [
  { key: 'created', label: 'Order Placed' },
  { key: 'material_check', label: 'Yarn Allocated' },
  { key: 'in_production', label: 'Weaving & Dyeing' },
  { key: 'ready_to_ship', label: 'Quality Passed' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'completed', label: 'Delivered' },
];

export default function BuyerOrders() {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({
    fabric_type: '',
    colour: '',
    quantity_metres: '',
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    unit_price: 5.5,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordRes, dispRes] = await Promise.all([
        api.get('/orders'),
        api.get('/dispatch/history'),
      ]);
      setOrders(ordRes.data);
      setDispatches(dispRes.data);
    } catch (err) {
      console.error('Failed to load buyer orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg('');

      const res = await api.post('/orders', {
        fabric_type: orderForm.fabric_type.trim(),
        colour: orderForm.colour.trim(),
        quantity_metres: parseFloat(orderForm.quantity_metres),
        due_date: new Date(orderForm.due_date).toISOString(),
        unit_price: parseFloat(orderForm.unit_price) || 5.0,
      });

      setSuccessMsg(`Order ${res.data.order_number} submitted to Everest Textile Mills!`);
      setShowOrderModal(false);
      setOrderForm({
        fabric_type: '',
        colour: '',
        quantity_metres: '',
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        unit_price: 5.5,
      });
      fetchData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  // Stepper helper
  const getStepIndex = (status) => {
    if (status === 'quality_check') return 3;
    const idx = STAGE_STEPS.findIndex((s) => s.key === status);
    return idx === -1 ? 0 : idx;
  };

  const totalMetresOrdered = orders.reduce((acc, o) => acc + o.quantity_metres, 0);
  const totalMetresDelivered = dispatches.reduce((acc, d) => acc + d.total_metres, 0);

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      o.fabric_type.toLowerCase().includes(q) ||
      o.colour.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-950 text-teal-400 border border-teal-800 uppercase tracking-wider">
            Consignee Portal
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-2">Fabric Orders & Real-Time Tracking</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Welcome, <span className="text-white font-medium">{user?.full_name}</span>. Monitor yarn spinning, weaving progress, and live delivery dispatches in real time without phone calls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setErrorMsg('');
              setShowOrderModal(true);
            }}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Place Fabric Order</span>
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">My Orders</span>
          <div className="text-2xl font-bold text-white mt-1">{orders.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Contracts placed</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-sky-400 font-medium">In Production</span>
          <div className="text-2xl font-bold text-sky-400 mt-1">
            {orders.filter((o) => !['dispatched', 'completed'].includes(o.status)).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active on mill floor</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-indigo-400 font-medium">Total Metres Ordered</span>
          <div className="text-2xl font-bold text-indigo-400 mt-1">{totalMetresOrdered.toLocaleString()} m</div>
          <div className="text-[11px] text-slate-500 mt-1">All fabric types</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-emerald-400 font-medium">Delivered Metres</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{totalMetresDelivered.toLocaleString()} m</div>
          <div className="text-[11px] text-slate-500 mt-1">{dispatches.length} delivery challans</div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search my orders, fabric, colour..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Orders List with Progress Stepper */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            <Package className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p>You have not placed any fabric orders yet.</p>
            <p className="text-xs text-slate-600 mt-1">Click "Place Fabric Order" above to submit your first manufacturing contract.</p>
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const currentStepIdx = getStepIndex(ord.status);
            const linkedDispatches = dispatches.filter((d) => d.order_id === ord.id);

            return (
              <div
                key={ord.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl hover:border-slate-700 transition-all"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-lg font-bold text-white">{ord.order_number}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-sky-400 font-mono">
                        {ord.quantity_metres} metres
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {ord.fabric_type} • Colour: <span className="text-slate-300 font-medium">{ord.colour}</span> • Due Date: {new Date(ord.due_date).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-base font-bold text-white">
                      ${ord.total_revenue?.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ${ord.unit_price} / metre
                    </div>
                  </div>
                </div>

                {/* Real-Time Stepper */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    Live Production & Delivery Pipeline
                  </h4>

                  <div className="relative flex flex-col md:flex-row justify-between gap-3 md:gap-0">
                    {/* Background Progress Bar */}
                    <div className="hidden md:block absolute top-3 left-6 right-6 h-1 bg-slate-800 -z-0">
                      <div
                        className="h-full bg-sky-500 transition-all duration-500"
                        style={{ width: `${(currentStepIdx / (STAGE_STEPS.length - 1)) * 100}%` }}
                      ></div>
                    </div>

                    {STAGE_STEPS.map((step, idx) => {
                      const isCompleted = idx <= currentStepIdx;
                      const isCurrent = idx === currentStepIdx;

                      return (
                        <div key={step.key} className="flex md:flex-col items-center gap-3 md:gap-2 z-10">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isCompleted
                                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                                : 'bg-slate-950 border border-slate-800 text-slate-500'
                            } ${isCurrent ? 'ring-4 ring-sky-500/20' : ''}`}
                          >
                            {isCompleted ? '✓' : idx + 1}
                          </div>
                          <span
                            className={`text-xs font-medium md:text-center ${
                              isCurrent
                                ? 'text-sky-400 font-bold'
                                : isCompleted
                                ? 'text-white'
                                : 'text-slate-500'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dispatched Delivery Manifests if any */}
                {linkedDispatches.length > 0 && (
                  <div className="pt-3 border-t border-slate-800">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Delivery Challans Issued</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {linkedDispatches.map((disp) => (
                        <div
                          key={disp.id}
                          className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs"
                        >
                          <div>
                            <div className="font-mono font-bold text-white">{disp.dispatch_number}</div>
                            <div className="text-[11px] text-slate-400">Invoice: {disp.invoice_number}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-sky-400">{disp.total_metres} m</span>
                            <div className="text-[10px] text-slate-500">{new Date(disp.dispatch_date).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Place Fabric Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-sky-400" />
                <span>Place New Manufacturing Contract</span>
              </h3>
              <button onClick={() => setShowOrderModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-300 rounded-xl text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handlePlaceOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Fabric Type / Construction *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Blue Cotton Poplin 40s"
                  value={orderForm.fabric_type}
                  onChange={(e) => setOrderForm({ ...orderForm, fabric_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Colour / Shade *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Blue"
                  value={orderForm.colour}
                  onChange={(e) => setOrderForm({ ...orderForm, colour: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Quantity (Metres) *</label>
                  <input
                    type="number"
                    step="10"
                    min="100"
                    required
                    placeholder="e.g. 1000"
                    value={orderForm.quantity_metres}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity_metres: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Target Delivery Date *</label>
                  <input
                    type="date"
                    required
                    value={orderForm.due_date}
                    onChange={(e) => setOrderForm({ ...orderForm, due_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Unit Price ($ / Metre)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  required
                  value={orderForm.unit_price}
                  onChange={(e) => setOrderForm({ ...orderForm, unit_price: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
                Total Contract Estimate: <strong className="text-white">${((parseFloat(orderForm.quantity_metres) || 0) * (parseFloat(orderForm.unit_price) || 0)).toLocaleString()}</strong>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-sky-500/20"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
