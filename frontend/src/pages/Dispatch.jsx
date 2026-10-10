import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Truck,
  PackageCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Loader2,
  Calendar,
  Layers,
  Building,
  Hash,
  ArrowRight,
  Printer,
  X,
  Clock,
  Check,
  MapPin,
  Filter
} from 'lucide-react';

const DELIVERY_STATUS_OPTIONS = [
  { value: 'ready_for_dispatch', label: 'Ready for Dispatch' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'delivery_failed', label: 'Delivery Failed' },
];

const STATUS_CONFIG = {
  ready_for_dispatch: {
    label: 'Ready for Dispatch',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  dispatched: {
    label: 'Dispatched',
    badge: 'bg-sky-50 text-sky-800 border-sky-200',
    dot: 'bg-sky-500',
  },
  in_transit: {
    label: 'In Transit',
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  delivered: {
    label: 'Delivered',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-600',
  },
  delivery_failed: {
    label: 'Delivery Failed',
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
    dot: 'bg-rose-600',
  },
};

const getStatusConfig = (rawStatus) => {
  const key = (rawStatus || 'dispatched').toLowerCase().replace(/[\s-]/g, '_');
  return STATUS_CONFIG[key] || STATUS_CONFIG.dispatched;
};

export default function Dispatch() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'history'
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selection for dispatch
  const [selectedRollIds, setSelectedRollIds] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // Dispatch Challan Modal
  const [showChallanModal, setShowChallanModal] = useState(false);
  const [currentChallan, setCurrentChallan] = useState(null);

  // Status updates
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Authorized roles check
  const canDispatch = ['admin', 'store_manager'].includes(user?.role);
  const canUpdateDelivery = ['admin', 'store_manager'].includes(user?.role);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fgRes, histRes] = await Promise.all([
        api.get('/dispatch/finished-goods'),
        api.get('/dispatch/history'),
      ]);
      setFinishedGoods(fgRes.data);
      setHistory(histRes.data);
    } catch (err) {
      console.error('Failed to load dispatch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Group available finished goods by order
  const ordersMap = {};
  finishedGoods.forEach((fg) => {
    if (!ordersMap[fg.order_id]) {
      ordersMap[fg.order_id] = {
        order_id: fg.order_id,
        order_number: fg.order_number,
        buyer_id: fg.buyer_id,
        buyer_name: fg.buyer_name,
        fabric_type: fg.fabric_type,
        colour: fg.colour,
        rolls: [],
        totalMetres: 0,
      };
    }
    ordersMap[fg.order_id].rolls.push(fg);
    ordersMap[fg.order_id].totalMetres += fg.length_metres;
  });
  const groupedOrders = Object.values(ordersMap);

  const toggleRollSelection = (roll) => {
    if (selectedOrderId && selectedOrderId !== roll.order_id) {
      // Switching orders resets selection to keep single order per dispatch
      setSelectedOrderId(roll.order_id);
      setSelectedRollIds([roll.roll_id]);
      return;
    }

    setSelectedOrderId(roll.order_id);
    if (selectedRollIds.includes(roll.roll_id)) {
      const next = selectedRollIds.filter((id) => id !== roll.roll_id);
      setSelectedRollIds(next);
      if (next.length === 0) setSelectedOrderId(null);
    } else {
      setSelectedRollIds([...selectedRollIds, roll.roll_id]);
    }
  };

  const selectAllForOrder = (order) => {
    if (selectedOrderId === order.order_id && selectedRollIds.length === order.rolls.length) {
      setSelectedRollIds([]);
      setSelectedOrderId(null);
    } else {
      setSelectedOrderId(order.order_id);
      setSelectedRollIds(order.rolls.map((r) => r.roll_id));
    }
  };

  const handleCreateDispatch = async (e) => {
    e.preventDefault();
    if (!selectedOrderId || selectedRollIds.length === 0) {
      setErrorMsg('Please select at least one roll to dispatch');
      return;
    }
    if (!invoiceNumber.trim()) {
      setErrorMsg('Please enter an Invoice / Delivery Challan Number');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const res = await api.post('/dispatch', {
        order_id: selectedOrderId,
        roll_ids: selectedRollIds,
        invoice_number: invoiceNumber.trim(),
      });

      setSuccessMsg(`Dispatch ${res.data.dispatch_number} created successfully! Total metres: ${res.data.total_metres}m`);
      setCurrentChallan(res.data);
      setShowChallanModal(true);

      // Reset form
      setSelectedRollIds([]);
      setSelectedOrderId(null);
      setInvoiceNumber('');
      fetchData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to create dispatch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (dispatchId, newStatus) => {
    try {
      setUpdatingStatusId(dispatchId);
      setErrorMsg('');
      const res = await api.patch(`/dispatch/${dispatchId}/status`, { status: newStatus });
      setHistory((prev) => prev.map((item) => (item.id === dispatchId ? res.data : item)));
      if (currentChallan && currentChallan.id === dispatchId) {
        setCurrentChallan(res.data);
      }
      setSuccessMsg(`Dispatch #${res.data.dispatch_number} status updated to "${res.data.status_label || newStatus}"`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update delivery status');
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleMarkDelivered = async (dispatchId) => {
    try {
      setUpdatingStatusId(dispatchId);
      setErrorMsg('');
      const res = await api.post(`/dispatch/${dispatchId}/deliver`);
      setHistory((prev) => prev.map((item) => (item.id === dispatchId ? res.data : item)));
      if (currentChallan && currentChallan.id === dispatchId) {
        setCurrentChallan(res.data);
      }
      setSuccessMsg(`Dispatch #${res.data.dispatch_number} marked as Delivered successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to mark as delivered');
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const totalAvailableMetres = finishedGoods.reduce((acc, fg) => acc + fg.length_metres, 0);
  const totalDispatchedMetres = history.reduce((acc, d) => acc + d.total_metres, 0);
  const deliveredCount = history.filter((d) => (d.status || '').toLowerCase() === 'delivered').length;

  // Calculate selected rolls metres
  const selectedMetres = finishedGoods
    .filter((fg) => selectedRollIds.includes(fg.roll_id))
    .reduce((acc, fg) => acc + fg.length_metres, 0);

  const filteredHistory = history.filter((d) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = (
      d.dispatch_number?.toLowerCase().includes(q) ||
      d.order_number?.toLowerCase().includes(q) ||
      d.buyer_name?.toLowerCase().includes(q) ||
      d.invoice_number?.toLowerCase().includes(q) ||
      d.status?.toLowerCase().includes(q) ||
      (d.status_label && d.status_label.toLowerCase().includes(q))
    );

    const normStatus = (d.status || 'dispatched').toLowerCase().replace(/[\s-]/g, '_');
    const matchesStatus = statusFilter === 'all' || normStatus === statusFilter;

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 tracking-wide uppercase">
              Finished Goods & Outward Dispatch
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">Delivery Status & Challans</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">Finished Goods & Outward Dispatch</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            End-to-end dispatch and delivery workflow. Track shipments from Ready for Dispatch to Delivered with authorized confirmations.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-navy' : ''}`} />
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2.5 text-xs font-medium shadow-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2.5 text-xs font-medium shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Available Rolls</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{finishedGoods.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Passed inspection in stock</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-sky-700 font-semibold uppercase tracking-wider">Finished Stock Metres</span>
          <div className="text-2xl font-bold text-sky-700 mt-1 font-mono">{totalAvailableMetres.toLocaleString()} <span className="font-sans font-normal text-xs text-slate-500">m</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Ready for dispatch</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Dispatches Issued</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{history.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Total challans generated</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Delivered Dispatches</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
            {deliveredCount} <span className="font-sans font-normal text-xs text-slate-500">/ {history.length}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{totalDispatchedMetres.toLocaleString()} m dispatched</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('available')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 transition-colors border-b-2 -mb-px ${
            activeTab === 'available'
              ? 'border-primary-navy text-primary-navy'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Available Finished Goods ({finishedGoods.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 transition-colors border-b-2 -mb-px ${
            activeTab === 'history'
              ? 'border-primary-navy text-primary-navy'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Dispatch History & Challans ({history.length})</span>
        </button>
      </div>

      {/* TAB 1: AVAILABLE FINISHED GOODS */}
      {activeTab === 'available' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rolls by Order (2 Columns) */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-16 flex justify-center shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-primary-navy" />
              </div>
            ) : groupedOrders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
                <PackageCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-medium text-slate-600">No rolls currently available in Finished Goods inventory.</p>
                <p className="text-xs text-slate-400 mt-1">Pass fabric rolls in the Quality Control station to enroll them here.</p>
              </div>
            ) : (
              groupedOrders.map((order) => {
                const isSelectedOrder = selectedOrderId === order.order_id;
                const orderSelectedRolls = order.rolls.filter((r) => selectedRollIds.includes(r.roll_id));
                const allSelected = orderSelectedRolls.length === order.rolls.length;

                return (
                  <div
                    key={order.order_id}
                    className={`bg-white border rounded-2xl p-5 transition-all shadow-sm ${
                      isSelectedOrder
                        ? 'border-primary-navy ring-2 ring-primary-navy/10'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-base">{order.order_number}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                            {order.buyer_name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {order.fabric_type} • {order.colour} ({order.totalMetres}m available in {order.rolls.length} rolls)
                        </div>
                      </div>

                      {canDispatch && (
                        <button
                          type="button"
                          onClick={() => selectAllForOrder(order)}
                          className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-200"
                        >
                          {allSelected ? 'Deselect All' : 'Select All Rolls'}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-4">
                      {order.rolls.map((roll) => {
                        const isChecked = selectedRollIds.includes(roll.roll_id);

                        return (
                          <div
                            key={roll.roll_id}
                            onClick={() => canDispatch && toggleRollSelection(roll)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-sky-50 border-sky-400 text-slate-900 shadow-xs'
                                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="rounded border-slate-300 text-primary-navy focus:ring-0 w-4 h-4 cursor-pointer"
                              />
                              <div>
                                <div className="font-mono text-xs font-bold text-slate-900">{roll.roll_number}</div>
                                <div className="text-[11px] text-slate-500">{roll.length_metres} metres</div>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase">
                              Passed
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Dispatch Cart / Action Panel (1 Column) */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sticky top-6 shadow-sm">
              <div className="flex items-center gap-2 text-primary-navy text-xs font-bold uppercase tracking-wider mb-2">
                <Truck className="w-4 h-4" />
                <span>Create Dispatch Order</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Outward Challan</h3>
              <p className="text-xs text-slate-500 mt-1">
                Select rolls belonging to an order and generate an official delivery challan. Initial status is Dispatched.
              </p>

              <div className="my-5 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Selected Order:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedOrderId
                      ? groupedOrders.find((o) => o.order_id === selectedOrderId)?.order_number || selectedOrderId
                      : 'None selected'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Selected Rolls:</span>
                  <span className="font-bold text-slate-900">{selectedRollIds.length} roll(s)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Total Metres:</span>
                  <span className="font-bold text-primary-navy text-sm font-mono">{selectedMetres.toLocaleString()} m</span>
                </div>
              </div>

              {canDispatch ? (
                <form onSubmit={handleCreateDispatch} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Invoice / Challan Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. INV-2026-0901"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || selectedRollIds.length === 0}
                    className="w-full py-3 bg-primary-navy hover:bg-secondary-navy disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                    id="submit-dispatch-rolls-btn"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Truck className="w-4 h-4" />
                    )}
                    <span>Submit & Dispatch Fabric Rolls</span>
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
                  Only Store Managers and Admins can create outward dispatches.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DISPATCH HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search dispatch, invoice, buyer, order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                <option value="all">All Delivery Statuses</option>
                {DELIVERY_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-navy" />
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                No past dispatches found matching your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Dispatch #</th>
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Buyer</th>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Metres / Rolls</th>
                      <th className="py-3 px-4">Dispatch Date</th>
                      <th className="py-3 px-4">Delivery Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredHistory.map((d) => {
                      const normStatus = (d.status || 'dispatched').toLowerCase().replace(/[\s-]/g, '_');
                      const statusCfg = getStatusConfig(normStatus);
                      const isDelivered = normStatus === 'delivered';

                      return (
                        <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-primary-navy">
                            {d.dispatch_number}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-teal-700">
                            {d.order_number}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-900">
                            {d.buyer_name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                            {d.invoice_number}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 font-mono">{d.total_metres.toLocaleString()} m</span>
                            <span className="text-[11px] text-slate-500 block">{d.items?.length || 0} roll(s)</span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                            {new Date(d.dispatch_date).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 min-w-[210px]">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border w-fit ${
                                  statusCfg.badge
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}></span>
                                {d.status_label || statusCfg.label}
                              </span>
                              {isDelivered && (
                                <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                  <span title={d.delivered_at ? new Date(d.delivered_at).toLocaleString() : ''}>
                                    {d.delivered_at ? new Date(d.delivered_at).toLocaleDateString() : 'Delivered'}
                                    {d.delivered_by_name ? ` by ${d.delivered_by_name}` : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {canUpdateDelivery && (
                                <div className="flex items-center gap-1.5">
                                  {!isDelivered && (
                                    <button
                                      onClick={() => handleMarkDelivered(d.id)}
                                      disabled={updatingStatusId === d.id}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs flex items-center gap-1 disabled:opacity-50"
                                      title="Mark this dispatch as Delivered"
                                      id={`mark-delivered-btn-${d.id}`}
                                    >
                                      {updatingStatusId === d.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      )}
                                      <span className="hidden sm:inline">Delivered</span>
                                    </button>
                                  )}
                                  <select
                                    value={normStatus}
                                    onChange={(e) => handleUpdateStatus(d.id, e.target.value)}
                                    disabled={updatingStatusId === d.id}
                                    className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1.5 text-xs font-medium focus:ring-1 focus:ring-primary-navy focus:outline-none cursor-pointer disabled:opacity-50"
                                    title="Change Delivery Status Workflow"
                                    id={`status-select-${d.id}`}
                                  >
                                    {DELIVERY_STATUS_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              <button
                                onClick={() => {
                                  setCurrentChallan(d);
                                  setShowChallanModal(true);
                                }}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-primary-navy hover:text-white text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200 flex items-center gap-1"
                                title="View Delivery Challan"
                                id={`view-challan-btn-${d.id}`}
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">Challan</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delivery Challan Modal (Optimized 1-Page Printable Receipt) */}
      {showChallanModal && currentChallan && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex min-h-full items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            id="delivery-challan-receipt"
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl text-slate-800 flex flex-col max-h-[92vh] overflow-y-auto"
          >
            {/* Header Letterhead */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-lg font-black text-primary-navy uppercase tracking-wider">
                  Everest Textile Mills Ltd.
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Industrial Area Phase II, Mill Road • ISO 9001:2015 Certified Textile Mill
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold uppercase tracking-wider">
                    Official Outward Delivery Challan
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      getStatusConfig(currentChallan.status).badge
                    }`}
                  >
                    Status: {currentChallan.status_label || getStatusConfig(currentChallan.status).label}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-bold text-slate-900">{currentChallan.dispatch_number}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Invoice: <span className="font-mono font-bold text-slate-800">{currentChallan.invoice_number}</span></div>
                <div className="text-[11px] text-slate-500">Date: {new Date(currentChallan.dispatch_date).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Delivery Confirmation Banner (if Delivered) */}
            {currentChallan.status === 'delivered' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">Delivery Confirmed</span>
                  {currentChallan.delivered_by_name && (
                    <span className="text-emerald-700">• Received by Consignee, authorized by {currentChallan.delivered_by_name}</span>
                  )}
                </div>
                {currentChallan.delivered_at && (
                  <span className="font-mono text-[11px] text-emerald-700">
                    {new Date(currentChallan.delivered_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {/* Recipient & Order Reference Details */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Consignee / Buyer</span>
                <div className="text-xs font-bold text-slate-900 mt-0.5">{currentChallan.buyer_name}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Customer Order Ref</span>
                <div className="font-mono text-xs font-bold text-teal-700 mt-0.5">{currentChallan.order_number}</div>
              </div>
            </div>

            {/* Itemized Rolls Manifest */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <h4 className="text-[11px] font-bold uppercase text-slate-600">Dispatched Roll Manifest</h4>
                <span className="text-[10px] font-semibold text-slate-400">{currentChallan.items?.length || 0} Serialized Roll(s)</span>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-1.5 px-3">#</th>
                      <th className="py-1.5 px-3">Roll Serial Number</th>
                      <th className="py-1.5 px-3 text-right">Length (Metres)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(currentChallan.items || []).map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="py-1.5 px-3 text-slate-400 text-[11px]">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-mono font-medium text-slate-900 text-[11px]">{it.roll_number}</td>
                        <td className="py-1.5 px-3 text-right font-bold text-slate-900 font-mono text-[11px]">{it.metres} m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Footer Summary */}
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase">Total Net Metres Dispatched:</span>
              <span className="text-lg font-black text-primary-navy font-mono">{currentChallan.total_metres?.toLocaleString() || 0} m</span>
            </div>

            {/* Official Signatures & Verification Block (Print Ready) */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 text-xs">
              <div className="text-center pt-6 border-t border-slate-300 border-dashed">
                <span className="text-[11px] font-semibold text-slate-600">Authorized Mill Store Incharge</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Everest Textile Mills Ltd.</p>
              </div>
              <div className="text-center pt-6 border-t border-slate-300 border-dashed">
                <span className="text-[11px] font-semibold text-slate-600">Consignee Acceptance Signature</span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {currentChallan.status === 'delivered' ? '✓ Received & Verified' : 'Received in sound condition'}
                </p>
              </div>
            </div>

            {/* Action Buttons (Hidden during printing) */}
            <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 border border-slate-200 transition"
                  id="print-challan-btn"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Single-Page Challan</span>
                </button>
                {canUpdateDelivery && currentChallan.status !== 'delivered' && (
                  <button
                    type="button"
                    onClick={() => handleMarkDelivered(currentChallan.id)}
                    disabled={updatingStatusId === currentChallan.id}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
                    id="modal-mark-delivered-btn"
                  >
                    {updatingStatusId === currentChallan.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Mark as Delivered</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowChallanModal(false)}
                className="px-5 py-2 bg-primary-navy hover:bg-secondary-navy text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
