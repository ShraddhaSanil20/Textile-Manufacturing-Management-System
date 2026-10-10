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
  FileText,
  X
} from 'lucide-react';

import { useLocation, useNavigate } from 'react-router-dom';

const STAGE_STEPS = [
  { key: 'created', label: 'Order Placed' },
  { key: 'material_check', label: 'Yarn Allocated' },
  { key: 'in_production', label: 'Weaving & Dyeing' },
  { key: 'ready_to_ship', label: 'Quality Passed' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'completed', label: 'Delivered' },
];

export default function BuyerOrders({ initialView = 'my_orders' }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isPlaceOrderRoute = location.pathname === '/place-order' || initialView === 'place_order';
  const [activeTab, setActiveTab] = useState(isPlaceOrderRoute ? 'place_order' : 'my_orders');

  useEffect(() => {
    if (location.pathname === '/place-order') {
      setActiveTab('place_order');
    } else if (location.pathname === '/my-orders') {
      setActiveTab('my_orders');
    }
  }, [location.pathname]);

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
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 tracking-wide uppercase">
              Consignee Portal
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">Self-Service Order Tracking</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">Fabric Orders & Real-Time Tracking</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Welcome, <span className="text-slate-900 font-bold">{user?.full_name}</span>. Monitor yarn spinning, weaving progress, and live delivery dispatches in real time without phone calls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setErrorMsg('');
              setShowOrderModal(true);
            }}
            className="px-4 py-2 bg-primary-navy hover:bg-secondary-navy text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            id="buyer-add-order-btn"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Order</span>
          </button>

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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => {
            setActiveTab('place_order');
            navigate('/place-order');
          }}
          className={`pb-3 text-xs font-bold flex items-center gap-2 transition-colors border-b-2 -mb-px ${
            activeTab === 'place_order'
              ? 'border-primary-navy text-primary-navy'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="tab-place-order"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Place Order</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('my_orders');
            navigate('/my-orders');
          }}
          className={`pb-3 text-xs font-bold flex items-center gap-2 transition-colors border-b-2 -mb-px ${
            activeTab === 'my_orders'
              ? 'border-primary-navy text-primary-navy'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="tab-my-orders"
        >
          <Package className="w-4 h-4" />
          <span>My Orders & Tracking ({orders.length})</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2.5 text-xs font-medium shadow-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">My Orders</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{orders.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Contracts placed</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-sky-700 font-semibold uppercase tracking-wider">In Production</span>
          <div className="text-2xl font-bold text-sky-700 mt-1 font-mono">
            {orders.filter((o) => !['dispatched', 'completed'].includes(o.status)).length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Active on mill floor</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-indigo-700 font-semibold uppercase tracking-wider">Total Metres Ordered</span>
          <div className="text-2xl font-bold text-indigo-700 mt-1 font-mono">{totalMetresOrdered.toLocaleString()} <span className="font-sans font-normal text-xs text-slate-500">m</span></div>
          <div className="text-[11px] text-slate-400 mt-1">All fabric types</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Delivered Metres</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">{totalMetresDelivered.toLocaleString()} <span className="font-sans font-normal text-xs text-slate-500">m</span></div>
          <div className="text-[11px] text-slate-400 mt-1">{dispatches.length} delivery challans</div>
        </div>
      </div>

      {/* TAB 1: PLACE ORDER VIEW */}
      {activeTab === 'place_order' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 uppercase tracking-wider">
                  New Order Placement
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1.5">Place Order for Mill Production</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure custom yarn weaving and dyeing specs. Your contract will be verified by the Everest Mills production team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setShowOrderModal(true);
                }}
                className="px-4 py-2 bg-primary-navy hover:bg-secondary-navy text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                id="place-order-section-add-order-btn"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Order (Modal View)</span>
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handlePlaceOrder} className="mt-6 space-y-5 max-w-2xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Fabric Type & Construction Specification *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100% Combed Cotton Poplin 40s (130 GSM)"
                  value={orderForm.fabric_type}
                  onChange={(e) => setOrderForm({ ...orderForm, fabric_type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Colour / Pantone Shade *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Navy Blue (PANTONE 19-4024)"
                    value={orderForm.colour}
                    onChange={(e) => setOrderForm({ ...orderForm, colour: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Required Quantity (Metres) *</label>
                  <input
                    type="number"
                    step="10"
                    min="100"
                    required
                    placeholder="e.g. 1000"
                    value={orderForm.quantity_metres}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity_metres: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Delivery Due Date *</label>
                  <input
                    type="date"
                    required
                    value={orderForm.due_date}
                    onChange={(e) => setOrderForm({ ...orderForm, due_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Commercial Unit Price ($ / Metre) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    required
                    value={orderForm.unit_price}
                    onChange={(e) => setOrderForm({ ...orderForm, unit_price: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono shadow-2xs"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">Estimated Total Contract Value:</span>
                <span className="text-base font-black text-primary-navy font-mono">
                  ${((parseFloat(orderForm.quantity_metres) || 0) * (parseFloat(orderForm.unit_price) || 0)).toLocaleString()} USD
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-primary-navy hover:bg-secondary-navy text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  id="submit-place-order-btn"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <PlusCircle className="w-4 h-4" />
                  <span>Submit & Add Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: MY ORDERS & REAL-TIME TRACKING */}
      {activeTab === 'my_orders' && (
        <div className="space-y-6">
          {/* Search Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search my orders, fabric, colour..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <button
              onClick={() => {
                setErrorMsg('');
                setShowOrderModal(true);
              }}
              className="px-3.5 py-2 bg-primary-navy hover:bg-secondary-navy text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Order</span>
            </button>
          </div>

      {/* Orders List with Progress Stepper */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 flex justify-center shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-primary-navy" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
            <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-medium text-slate-600">You have not placed any fabric orders yet.</p>
            <p className="text-xs text-slate-400 mt-1">Click "Place Fabric Order" above to submit your first manufacturing contract.</p>
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const currentStepIdx = getStepIndex(ord.status);
            const linkedDispatches = dispatches.filter((d) => d.order_id === ord.id);

            return (
              <div
                key={ord.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-lg font-bold text-primary-navy">{ord.order_number}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-semibold border border-slate-200">
                        {ord.quantity_metres.toLocaleString()} metres
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {ord.fabric_type} • Colour: <span className="text-slate-800 font-semibold">{ord.colour}</span> • Due Date: {new Date(ord.due_date).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-base font-bold text-emerald-700">
                      ${ord.total_revenue?.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ${ord.unit_price} / metre
                    </div>
                  </div>
                </div>

                {/* Real-Time Stepper */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
                    Live Production & Delivery Pipeline
                  </h4>

                  <div className="relative flex flex-col md:flex-row justify-between gap-3 md:gap-0">
                    {/* Background Progress Bar */}
                    <div className="hidden md:block absolute top-3 left-6 right-6 h-1 bg-slate-200 -z-0">
                      <div
                        className="h-full bg-primary-navy transition-all duration-500"
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
                                ? 'bg-primary-navy text-white shadow-sm'
                                : 'bg-white border-2 border-slate-300 text-slate-400'
                            } ${isCurrent ? 'ring-4 ring-primary-navy/20' : ''}`}
                          >
                            {isCompleted ? '✓' : idx + 1}
                          </div>
                          <span
                            className={`text-xs font-semibold md:text-center ${
                              isCurrent
                                ? 'text-primary-navy font-bold'
                                : isCompleted
                                ? 'text-slate-800'
                                : 'text-slate-400'
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
                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Delivery Challans Issued</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {linkedDispatches.map((disp) => (
                        <div
                          key={disp.id}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs"
                        >
                          <div>
                            <div className="font-mono font-bold text-slate-900">{disp.dispatch_number}</div>
                            <div className="text-[11px] text-slate-500">Invoice: {disp.invoice_number}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-primary-navy">{disp.total_metres} m</span>
                            <div className="text-[10px] text-slate-400">{new Date(disp.dispatch_date).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }))}
        </div>
      </div>
    )}

      {/* Place Fabric Order Modal (Scrollable with Sticky Footer) */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex justify-between items-start shrink-0">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                  New Manufacturing Contract
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Add Order</h3>
                <p className="text-xs text-slate-500 mt-0.5">Configure fabric specification & delivery deadline.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="m-6 mb-0 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handlePlaceOrder} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fabric Construction Spec *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Blue Cotton Poplin 40s"
                    value={orderForm.fabric_type}
                    onChange={(e) => setOrderForm({ ...orderForm, fabric_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Colour / Shade *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Blue"
                    value={orderForm.colour}
                    onChange={(e) => setOrderForm({ ...orderForm, colour: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity (Metres) *</label>
                    <input
                      type="number"
                      step="10"
                      min="100"
                      required
                      placeholder="e.g. 1000"
                      value={orderForm.quantity_metres}
                      onChange={(e) => setOrderForm({ ...orderForm, quantity_metres: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Target Delivery Date *</label>
                    <input
                      type="date"
                      required
                      value={orderForm.due_date}
                      onChange={(e) => setOrderForm({ ...orderForm, due_date: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Price ($ / Metre)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    required
                    value={orderForm.unit_price}
                    onChange={(e) => setOrderForm({ ...orderForm, unit_price: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                  Total Contract Estimate: <strong className="text-slate-900 font-mono">${((parseFloat(orderForm.quantity_metres) || 0) * (parseFloat(orderForm.unit_price) || 0)).toLocaleString()}</strong>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-200 flex justify-end gap-3 rounded-b-2xl z-10 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-primary-navy hover:bg-secondary-navy text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-md transition disabled:opacity-50"
                  id="modal-submit-add-order-btn"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit & Add Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
