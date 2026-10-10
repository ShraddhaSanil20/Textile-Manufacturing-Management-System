import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  ShoppingCart,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Search,
  RefreshCw,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
  X
} from 'lucide-react';

const ORDER_STATUS_CONFIG = {
  created: { label: 'Created', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  material_check: { label: 'Material Checked', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  in_production: { label: 'In Production', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  quality_check: { label: 'Quality Check', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  ready_to_ship: { label: 'Ready to Ship', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  dispatched: { label: 'Dispatched', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
  completed: { label: 'Completed', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function Orders() {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [checkingId, setCheckingId] = useState(null);

  // Form states
  const [newOrder, setNewOrder] = useState({
    buyer_id: '',
    fabric_type: '',
    colour: '',
    quantity_metres: '',
    due_date: '',
    unit_price: 5.0,
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersRes, buyersRes] = await Promise.all([
        api.get('/orders'),
        user?.role !== 'buyer' ? api.get('/orders/meta/buyers') : Promise.resolve({ data: [] }),
      ]);
      setOrders(ordersRes.data);
      setBuyers(buyersRes.data);
    } catch (err) {
      console.error('Failed to load orders data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const payload = {
        fabric_type: newOrder.fabric_type.trim(),
        colour: newOrder.colour.trim(),
        quantity_metres: parseFloat(newOrder.quantity_metres),
        due_date: new Date(newOrder.due_date).toISOString(),
        unit_price: parseFloat(newOrder.unit_price) || 0,
      };
      if (user?.role !== 'buyer' && newOrder.buyer_id) {
        payload.buyer_id = parseInt(newOrder.buyer_id);
      }
      await api.post('/orders', payload);
      setShowCreateModal(false);
      setNewOrder({ buyer_id: '', fabric_type: '', colour: '', quantity_metres: '', due_date: '', unit_price: 5.0 });
      setSuccessBanner('Customer order placed successfully.');
      setTimeout(() => setSuccessBanner(''), 4000);
      await loadData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMaterialCheck = async (orderId) => {
    setCheckingId(orderId);
    try {
      const res = await api.post(`/orders/${orderId}/material-check`);
      setCheckResult(res.data);
      setShowCheckModal(true);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Material check failed');
    } finally {
      setCheckingId(null);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      setSuccessBanner(`Order status advanced to '${ORDER_STATUS_CONFIG[newStatus]?.label || newStatus}'.`);
      setTimeout(() => setSuccessBanner(''), 3000);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Status update failed');
    }
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.fabric_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.colour.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.buyer_name && o.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 tracking-wide uppercase">
              Customer Operations
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">End-to-End Tracking</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">Customer Fabric Orders</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Replaces phone-call status checks. Live fabric orders, automated yarn shortage verification, and stage progression.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => loadData()}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 transition shadow-sm"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-navy' : ''}`} />
          </button>
          <button
            onClick={() => {
              setFormError('');
              setShowCreateModal(true);
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-navy hover:bg-secondary-navy text-white text-xs font-semibold shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            Place New Order
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

      {/* Orders Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary-navy" />
            Active Orders ({orders.length})
          </h2>
          <div className="w-full sm:w-64 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by order #, fabric, buyer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-teal-500 transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Order Number</th>
                <th className="px-5 py-3.5">Buyer Company</th>
                <th className="px-5 py-3.5">Fabric & Colour</th>
                <th className="px-5 py-3.5 text-right">Length (Metres)</th>
                <th className="px-5 py-3.5">Due Date</th>
                <th className="px-5 py-3.5 text-center">Lifecycle Status</th>
                <th className="px-5 py-3.5 text-right">Revenue ($)</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400 font-medium">
                    No customer orders found. Click "Place New Order" above.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const statusConf = ORDER_STATUS_CONFIG[ord.status] || {
                    label: ord.status,
                    badge: 'bg-slate-100 text-slate-700 border-slate-200',
                  };
                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-primary-navy">{ord.order_number}</td>
                      <td className="px-5 py-4 font-medium text-slate-900">{ord.buyer_name || 'Direct Buyer'}</td>
                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-900">{ord.fabric_type}</span>
                        <span className="block text-[11px] text-slate-500">{ord.colour}</span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-slate-900">
                        {ord.quantity_metres.toLocaleString()} <span className="font-sans font-normal text-slate-500">m</span>
                      </td>
                      <td className="px-5 py-4 font-mono text-[11px] text-slate-500">
                        {new Date(ord.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConf.badge}`}>
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-emerald-700">
                        ${ord.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-right space-x-1.5">
                        {user?.role !== 'buyer' && (
                          <>
                            <button
                              onClick={() => handleMaterialCheck(ord.id)}
                              disabled={checkingId === ord.id}
                              className="px-2.5 py-1.5 text-[11px] font-semibold bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg border border-teal-200 transition inline-flex items-center gap-1"
                              title="Verify raw yarn availability in inventory"
                            >
                              {checkingId === ord.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              Check Yarn
                            </button>

                            {ord.status === 'created' && (
                              <button
                                onClick={() => handleStatusChange(ord.id, 'material_check')}
                                className="px-2.5 py-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition"
                              >
                                Advance →
                              </button>
                            )}
                            {ord.status === 'material_check' && (
                              <button
                                onClick={() => handleStatusChange(ord.id, 'in_production')}
                                className="px-2.5 py-1.5 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 transition"
                              >
                                Start Prod →
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Place New Order */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-slate-900">Place Customer Fabric Order</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Register an order for woven/dyed fabric rolls.</p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-3.5">
              {user?.role !== 'buyer' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Buyer / Client</label>
                  <select
                    required
                    value={newOrder.buyer_id}
                    onChange={(e) => setNewOrder({ ...newOrder, buyer_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">-- Select Buyer Company --</option>
                    {buyers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.company_name} ({b.contact_person || b.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fabric Specification</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Blue Cotton Poplin 40s, Denim Twill"
                  value={newOrder.fabric_type}
                  onChange={(e) => setNewOrder({ ...newOrder, fabric_type: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Colour / Shade</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Blue, Black"
                    value={newOrder.colour}
                    onChange={(e) => setNewOrder({ ...newOrder, colour: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity (Metres)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="e.g. 1000"
                    value={newOrder.quantity_metres}
                    onChange={(e) => setNewOrder({ ...newOrder, quantity_metres: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Due Date</label>
                  <input
                    type="date"
                    required
                    value={newOrder.due_date}
                    onChange={(e) => setNewOrder({ ...newOrder, due_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Price ($/m)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={newOrder.unit_price}
                    onChange={(e) => setNewOrder({ ...newOrder, unit_price: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-primary-navy hover:bg-secondary-navy text-white rounded-lg shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Place Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Material Availability Check Result */}
      {showCheckModal && checkResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Yarn Material Availability Check</h3>
              </div>
              <button
                onClick={() => setShowCheckModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`p-4 rounded-xl border text-xs mb-4 ${
                checkResult.sufficient
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {checkResult.sufficient ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold text-sm mb-1">
                    {checkResult.sufficient ? 'Yarn In Stock — Ready to Produce' : 'Yarn Shortage Detected!'}
                  </p>
                  <p className="text-xs">{checkResult.message}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Order Reference:</span>
                <span className="text-slate-900 font-bold">{checkResult.order_number}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Fabric / Colour:</span>
                <span className="text-slate-900">
                  {checkResult.fabric_type} ({checkResult.colour})
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Fabric Target:</span>
                <span className="text-slate-900">{checkResult.ordered_metres} metres</span>
              </div>
              <div className="border-t border-slate-200 my-1"></div>
              <div className="flex justify-between text-slate-600">
                <span>Yarn Required (yield 0.25 kg/m):</span>
                <span className="text-amber-700 font-bold">{checkResult.required_yarn_kg} kg</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Current Stock on Hand:</span>
                <span className="text-teal-700 font-bold">{checkResult.available_yarn_kg} kg</span>
              </div>
              {checkResult.shortage_kg > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Deficit to Purchase:</span>
                  <span>{checkResult.shortage_kg} kg</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowCheckModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-primary-navy hover:bg-secondary-navy text-white rounded-lg shadow-sm transition"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
