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
  Printer
} from 'lucide-react';

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

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const canDispatch = ['admin', 'store_manager'].includes(user?.role);

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

  const totalAvailableMetres = finishedGoods.reduce((acc, fg) => acc + fg.length_metres, 0);
  const totalDispatchedMetres = history.reduce((acc, d) => acc + d.total_metres, 0);

  // Calculate selected rolls metres
  const selectedMetres = finishedGoods
    .filter((fg) => selectedRollIds.includes(fg.roll_id))
    .reduce((acc, fg) => acc + fg.length_metres, 0);

  const filteredHistory = history.filter((d) => {
    const q = searchQuery.toLowerCase();
    return (
      d.dispatch_number.toLowerCase().includes(q) ||
      d.order_number.toLowerCase().includes(q) ||
      d.buyer_name.toLowerCase().includes(q) ||
      d.invoice_number.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase tracking-wider">
            Finished Goods & Delivery
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-2">Finished Goods & Outward Dispatch</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Atomic delivery challan dispatch. Rolls that passed quality check are deducted and sealed with buyer invoices.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
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
          <span className="text-xs text-emerald-400 font-medium">Available Rolls</span>
          <div className="text-2xl font-bold text-white mt-1">{finishedGoods.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Passed inspection</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-sky-400 font-medium">Finished Stock Metres</span>
          <div className="text-2xl font-bold text-sky-400 mt-1">{totalAvailableMetres.toLocaleString()} m</div>
          <div className="text-[11px] text-slate-500 mt-1">Ready for dispatch</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Completed Dispatches</span>
          <div className="text-2xl font-bold text-white mt-1">{history.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Delivery challans issued</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-purple-400 font-medium">Total Fabric Dispatched</span>
          <div className="text-2xl font-bold text-purple-400 mt-1">{totalDispatchedMetres.toLocaleString()} m</div>
          <div className="text-[11px] text-slate-500 mt-1">Fulfilled to buyers</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('available')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 -mb-px ${
            activeTab === 'available'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Available Finished Goods ({finishedGoods.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 -mb-px ${
            activeTab === 'history'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Dispatch History & Invoices ({history.length})</span>
        </button>
      </div>

      {/* TAB 1: AVAILABLE FINISHED GOODS */}
      {activeTab === 'available' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rolls by Order (2 Columns) */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
              </div>
            ) : groupedOrders.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                <PackageCheck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p>No rolls currently available in Finished Goods inventory.</p>
                <p className="text-xs text-slate-600 mt-1">Pass fabric rolls in the Quality Control station to enroll them here.</p>
              </div>
            ) : (
              groupedOrders.map((order) => {
                const isSelectedOrder = selectedOrderId === order.order_id;
                const orderSelectedRolls = order.rolls.filter((r) => selectedRollIds.includes(r.roll_id));
                const allSelected = orderSelectedRolls.length === order.rolls.length;

                return (
                  <div
                    key={order.order_id}
                    className={`bg-slate-900 border rounded-2xl p-5 transition-all ${
                      isSelectedOrder
                        ? 'border-sky-500/80 ring-1 ring-sky-500/30'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-base">{order.order_number}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-sky-400 font-medium">
                            {order.buyer_name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {order.fabric_type} • {order.colour} ({order.totalMetres}m available in {order.rolls.length} rolls)
                        </div>
                      </div>

                      {canDispatch && (
                        <button
                          type="button"
                          onClick={() => selectAllForOrder(order)}
                          className="text-xs font-semibold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
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
                                ? 'bg-sky-950/40 border-sky-500 text-white'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0 w-4 h-4 cursor-pointer"
                              />
                              <div>
                                <div className="font-mono text-xs font-bold text-white">{roll.roll_number}</div>
                                <div className="text-[11px] text-slate-400">{roll.length_metres} metres</div>
                              </div>
                            </div>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold uppercase">
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sticky top-6 shadow-xl">
              <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Truck className="w-4 h-4" />
                <span>Create Dispatch Order</span>
              </div>
              <h3 className="text-lg font-bold text-white">Outward Challan</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select rolls belonging to an order and generate an official delivery challan.
              </p>

              {errorMsg && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs mt-4">
                  {errorMsg}
                </div>
              )}

              <div className="my-5 p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Selected Order:</span>
                  <span className="font-mono font-bold text-white">
                    {selectedOrderId
                      ? groupedOrders.find((o) => o.order_id === selectedOrderId)?.order_number || selectedOrderId
                      : 'None selected'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Selected Rolls:</span>
                  <span className="font-bold text-white">{selectedRollIds.length} roll(s)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Total Metres:</span>
                  <span className="font-bold text-sky-400 text-sm">{selectedMetres.toLocaleString()} m</span>
                </div>
              </div>

              {canDispatch ? (
                <form onSubmit={handleCreateDispatch} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Invoice / Challan Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. INV-2026-0901"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || selectedRollIds.length === 0}
                    className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Truck className="w-4 h-4" />
                    )}
                    <span>Dispatch Fabric Rolls</span>
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-500 text-center">
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search dispatch, invoice, buyer, order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No past dispatches recorded.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Dispatch #</th>
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Buyer</th>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Total Metres</th>
                      <th className="py-3 px-4">Rolls</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Delivery Challan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredHistory.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          {d.dispatch_number}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-sky-400">
                          {d.order_number}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-white">
                          {d.buyer_name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                          {d.invoice_number}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {d.total_metres.toLocaleString()} m
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-400">
                          {d.items.length} roll(s)
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-400">
                          {new Date(d.dispatch_date).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setCurrentChallan(d);
                              setShowChallanModal(true);
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors border border-slate-700 flex items-center gap-1.5 ml-auto"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Challan</span>
                          </button>
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

      {/* Delivery Challan Modal */}
      {showChallanModal && currentChallan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-2xl text-slate-200">
            {/* Header Letterhead */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-5">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">
                  Everest Textile Mills
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Industrial Area Phase II, Mill Road • Quality Fabric Manufacturing
                </p>
                <div className="inline-block mt-2 px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold uppercase tracking-wider">
                  Outward Delivery Challan
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-bold text-white">{currentChallan.dispatch_number}</div>
                <div className="text-xs text-slate-400 mt-1">Invoice: <span className="font-mono text-white">{currentChallan.invoice_number}</span></div>
                <div className="text-xs text-slate-400">Date: {new Date(currentChallan.dispatch_date).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Recipient Details */}
            <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 uppercase font-semibold">Consignee / Buyer:</span>
                <div className="text-sm font-bold text-white mt-1">{currentChallan.buyer_name}</div>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-semibold">Customer Order Reference:</span>
                <div className="font-mono text-sm font-bold text-sky-400 mt-1">{currentChallan.order_number}</div>
              </div>
            </div>

            {/* Itemized Rolls */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Dispatched Roll Manifest</h4>
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Roll Serial Number</th>
                      <th className="py-2 px-3 text-right">Length (Metres)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {currentChallan.items.map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-medium text-white">{it.roll_number}</td>
                        <td className="py-2 px-3 text-right font-bold text-white">{it.metres} m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Footer */}
            <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-sm font-bold text-white uppercase">Total Net Metres Dispatched:</span>
              <span className="text-xl font-black text-sky-400 font-mono">{currentChallan.total_metres.toLocaleString()} m</span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Challan</span>
              </button>
              <button
                type="button"
                onClick={() => setShowChallanModal(false)}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold"
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
