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
  ArrowRight
} from 'lucide-react';

const ORDER_STATUS_CONFIG = {
  created: { label: 'Created', badge: 'bg-slate-800 text-slate-300 border-slate-700' },
  material_check: { label: 'Material Checked', badge: 'bg-sky-950 text-sky-400 border-sky-800' },
  in_production: { label: 'In Production', badge: 'bg-amber-950 text-amber-300 border-amber-800' },
  quality_check: { label: 'Quality Check', badge: 'bg-blue-950 text-blue-300 border-blue-800' },
  ready_to_ship: { label: 'Ready to Ship', badge: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
  dispatched: { label: 'Dispatched', badge: 'bg-teal-950 text-teal-300 border-teal-800' },
  completed: { label: 'Completed', badge: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 uppercase tracking-wider">
              Customer Operations
            </span>
            <span className="text-xs font-mono text-slate-500">End-to-End Tracking</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-2">Customer Fabric Orders</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Replaces phone-call status checks. Live fabric orders, automated yarn shortage verification, and stage progression.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => loadData()}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 transition"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setFormError('');
              setShowCreateModal(true);
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/25 transition"
          >
            <PlusCircle className="w-4 h-4" />
            Place New Order
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

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-sky-400" />
            Active Orders ({orders.length})
          </h2>
          <div className="w-full sm:w-64 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by order #, fabric, buyer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Order Number</th>
                <th className="px-5 py-3">Buyer Company</th>
                <th className="px-5 py-3">Fabric & Colour</th>
                <th className="px-5 py-3 text-right">Length (Metres)</th>
                <th className="px-5 py-3">Due Date</th>
                <th className="px-5 py-3 text-center">Lifecycle Status</th>
                <th className="px-5 py-3 text-right">Revenue ($)</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                    No customer orders found. Click "Place New Order" above.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const statusConf = ORDER_STATUS_CONFIG[ord.status] || {
                    label: ord.status,
                    badge: 'bg-slate-800 text-slate-300',
                  };
                  return (
                    <tr key={ord.id} className="hover:bg-slate-850/50 transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-sky-400">{ord.order_number}</td>
                      <td className="px-5 py-3.5 font-medium text-white">{ord.buyer_name || 'Buyer'}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-white">{ord.fabric_type}</span>
                        <span className="block text-[11px] text-slate-400">{ord.colour}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-white">
                        {ord.quantity_metres.toLocaleString()} m
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400">
                        {new Date(ord.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusConf.badge}`}>
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-emerald-400">
                        ${ord.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        {user?.role !== 'buyer' && (
                          <>
                            <button
                              onClick={() => handleMaterialCheck(ord.id)}
                              disabled={checkingId === ord.id}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-sky-900/60 hover:bg-sky-800 text-sky-300 rounded-lg border border-sky-700/60 transition inline-flex items-center gap-1"
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
                                className="px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
                              >
                                Advance →
                              </button>
                            )}
                            {ord.status === 'material_check' && (
                              <button
                                onClick={() => handleStatusChange(ord.id, 'in_production')}
                                className="px-2 py-1 text-[11px] font-medium bg-amber-900/60 hover:bg-amber-800 text-amber-300 rounded-lg border border-amber-700"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Place Customer Fabric Order</h3>
            <p className="text-xs text-slate-400 mb-4">Register an order for woven/dyed fabric rolls.</p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-3.5">
              {user?.role !== 'buyer' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Buyer / Client</label>
                  <select
                    required
                    value={newOrder.buyer_id}
                    onChange={(e) => setNewOrder({ ...newOrder, buyer_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
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
                <label className="block text-xs font-medium text-slate-300 mb-1">Fabric Specification</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Blue Cotton Poplin 40s, Denim Twill"
                  value={newOrder.fabric_type}
                  onChange={(e) => setNewOrder({ ...newOrder, fabric_type: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Colour / Shade</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Blue, Black"
                    value={newOrder.colour}
                    onChange={(e) => setNewOrder({ ...newOrder, colour: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Quantity (Metres)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="e.g. 1000"
                    value={newOrder.quantity_metres}
                    onChange={(e) => setNewOrder({ ...newOrder, quantity_metres: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Delivery Due Date</label>
                  <input
                    type="date"
                    required
                    value={newOrder.due_date}
                    onChange={(e) => setNewOrder({ ...newOrder, due_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Unit Price ($/m)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={newOrder.unit_price}
                    onChange={(e) => setNewOrder({ ...newOrder, unit_price: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-lg shadow-sky-600/25 flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-sky-400" />
              <h3 className="text-base font-bold text-white">Yarn Material Availability Check</h3>
            </div>

            <div
              className={`p-4 rounded-xl border text-xs mb-4 ${
                checkResult.sufficient
                  ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                  : 'bg-amber-950/80 border-amber-800 text-amber-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {checkResult.sufficient ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold text-sm mb-1">
                    {checkResult.sufficient ? 'Yarn In Stock — Ready to Produce' : 'Yarn Shortage Detected!'}
                  </p>
                  <p>{checkResult.message}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Order Reference:</span>
                <span className="text-white font-bold">{checkResult.order_number}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Fabric / Colour:</span>
                <span className="text-white">
                  {checkResult.fabric_type} ({checkResult.colour})
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Fabric Target:</span>
                <span className="text-white">{checkResult.ordered_metres} metres</span>
              </div>
              <div className="border-t border-slate-800 my-1"></div>
              <div className="flex justify-between text-slate-400">
                <span>Yarn Required (yield 0.25 kg/m):</span>
                <span className="text-amber-400 font-bold">{checkResult.required_yarn_kg} kg</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Current Stock on Hand:</span>
                <span className="text-sky-400 font-bold">{checkResult.available_yarn_kg} kg</span>
              </div>
              {checkResult.shortage_kg > 0 && (
                <div className="flex justify-between text-rose-400 font-bold">
                  <span>Deficit to Purchase:</span>
                  <span>{checkResult.shortage_kg} kg</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowCheckModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-lg"
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
