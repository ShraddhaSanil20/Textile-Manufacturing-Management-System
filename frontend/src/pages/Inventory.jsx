import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Boxes,
  PlusCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Building2,
  PackagePlus,
  Loader2,
  X
} from 'lucide-react';

export default function Inventory() {
  const { user } = useAuth();

  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [movements, setMovements] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  // Form states
  const [newMaterial, setNewMaterial] = useState({
    yarn_type: '',
    colour: '',
    quantity_on_hand: 0,
    unit: 'kg',
    reorder_threshold: 100,
  });

  const [movementForm, setMovementForm] = useState({
    material_id: '',
    movement_type: 'received',
    quantity: '',
    supplier_id: '',
    notes: '',
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [matsRes, supsRes, movsRes, alertsRes] = await Promise.all([
        api.get('/inventory/materials'),
        api.get('/inventory/suppliers'),
        api.get('/inventory/movements'),
        api.get('/inventory/alerts'),
      ]);
      setMaterials(matsRes.data);
      setSuppliers(supsRes.data);
      setMovements(movsRes.data);
      setAlerts(alertsRes.data);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);
    try {
      await api.post('/inventory/materials', {
        ...newMaterial,
        quantity_on_hand: parseFloat(newMaterial.quantity_on_hand) || 0,
        reorder_threshold: parseFloat(newMaterial.reorder_threshold) || 100,
      });
      setShowAddModal(false);
      setNewMaterial({ yarn_type: '', colour: '', quantity_on_hand: 0, unit: 'kg', reorder_threshold: 100 });
      setSuccessBanner('New yarn material added to registry successfully.');
      setTimeout(() => setSuccessBanner(''), 4000);
      await loadData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create material');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleRecordMovement = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);
    try {
      const payload = {
        material_id: parseInt(movementForm.material_id),
        movement_type: movementForm.movement_type,
        quantity: parseFloat(movementForm.quantity),
        notes: movementForm.notes,
      };
      if (movementForm.movement_type === 'received' && movementForm.supplier_id) {
        payload.supplier_id = parseInt(movementForm.supplier_id);
      }
      await api.post('/inventory/movements', payload);
      setShowMoveModal(false);
      setMovementForm({ material_id: '', movement_type: 'received', quantity: '', supplier_id: '', notes: '' });
      setSuccessBanner('Stock movement recorded and inventory balances updated.');
      setTimeout(() => setSuccessBanner(''), 4000);
      await loadData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to record movement');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openMovementModalFor = (mat, type = 'received') => {
    setSelectedMaterial(mat);
    setMovementForm({
      material_id: mat.id.toString(),
      movement_type: type,
      quantity: '',
      supplier_id: suppliers.length > 0 ? suppliers[0].id.toString() : '',
      notes: '',
    });
    setFormError('');
    setShowMoveModal(true);
  };

  const filteredMaterials = materials.filter(
    (m) =>
      m.yarn_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.colour.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 tracking-wide uppercase">
              Stock & Warehousing
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">Live Balances</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">Raw Material Inventory</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Replaces notebook stock ledgers. Record receipts, floor consumption, and monitor low-stock thresholds.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => loadData()}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 transition shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-navy' : ''}`} />
          </button>
          <button
            onClick={() => {
              setFormError('');
              setShowAddModal(true);
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-navy hover:bg-secondary-navy text-white text-xs font-semibold shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            Add Material
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

      {/* Low Stock Alert Drawer */}
      {alerts.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
            </div>
            <h2 className="text-sm font-bold text-amber-950">
              Low-Stock Warnings ({alerts.length} Material{alerts.length > 1 ? 's' : ''} at/below Reorder Threshold)
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map((alt) => (
              <div
                key={alt.material_id}
                className="bg-white border border-amber-200/80 rounded-xl p-3.5 flex justify-between items-center shadow-xs"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {alt.yarn_type} <span className="text-slate-500 font-normal">({alt.colour})</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    On Hand:{' '}
                    <span className="font-mono text-amber-700 font-bold">
                      {alt.quantity_on_hand} {alt.unit}
                    </span>{' '}
                    <span className="text-slate-300">|</span> Threshold: {alt.reorder_threshold} {alt.unit}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const mat = materials.find((m) => m.id === alt.material_id);
                    if (mat) openMovementModalFor(mat, 'received');
                  }}
                  className="px-2.5 py-1.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-xs"
                >
                  Receive Stock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Material Ledger Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-primary-navy" />
            Yarn Stock Ledger ({materials.length} types)
          </h2>
          <div className="w-full sm:w-64 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search yarn or colour..."
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
                <th className="px-5 py-3.5">Yarn Specification</th>
                <th className="px-5 py-3.5">Colour</th>
                <th className="px-5 py-3.5 text-right">Balance On Hand</th>
                <th className="px-5 py-3.5 text-right">Reorder Threshold</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-medium">
                    No raw materials found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-900">{mat.yarn_type}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500 border border-teal-600"></span>
                        {mat.colour}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-slate-900">
                      {mat.quantity_on_hand.toLocaleString()} <span className="font-sans font-normal text-slate-500">{mat.unit}</span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-slate-500">
                      {mat.reorder_threshold.toLocaleString()} <span className="font-sans font-normal text-slate-400">{mat.unit}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {mat.is_low_stock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" /> Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> In Stock
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <button
                        onClick={() => openMovementModalFor(mat, 'received')}
                        className="px-2.5 py-1.5 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition"
                      >
                        + Receive
                      </button>
                      <button
                        onClick={() => openMovementModalFor(mat, 'consumed')}
                        className="px-2.5 py-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition"
                      >
                        - Issue
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Movements Audit Log */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ArrowDownRight className="w-4 h-4 text-emerald-600" />
          Recent Stock Movements Log (Audit Trail)
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3">Supplier / Source</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">
                    No recorded movements yet. Use "+ Receive" or "- Issue" above.
                  </td>
                </tr>
              ) : (
                movements.slice(0, 15).map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {new Date(mov.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          mov.movement_type === 'received'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {mov.movement_type === 'received' ? (
                          <ArrowDownRight className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        {mov.movement_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {mov.material_yarn_type} <span className="text-slate-500">({mov.material_colour})</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {mov.movement_type === 'received' ? '+' : '-'}
                      {mov.quantity} kg
                    </td>
                    <td className="px-4 py-3 text-slate-600">{mov.supplier_name || 'Floor Production'}</td>
                    <td className="px-4 py-3 text-slate-500">{mov.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Add New Material */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Raw Material Specification</h3>
                <p className="text-xs text-slate-500 mt-0.5">Register a yarn variety into the mill's central inventory.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateMaterial} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Yarn Type / Count</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cotton 40s Combed, Linen 20s"
                    value={newMaterial.yarn_type}
                    onChange={(e) => setNewMaterial({ ...newMaterial, yarn_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Colour / Shade</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Navy Blue, Raw White"
                      value={newMaterial.colour}
                      onChange={(e) => setNewMaterial({ ...newMaterial, colour: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure</label>
                    <input
                      type="text"
                      required
                      value={newMaterial.unit}
                      onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Quantity ({newMaterial.unit})</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      required
                      value={newMaterial.quantity_on_hand}
                      onChange={(e) => setNewMaterial({ ...newMaterial, quantity_on_hand: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reorder Threshold ({newMaterial.unit})</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      required
                      value={newMaterial.reorder_threshold}
                      onChange={(e) => setNewMaterial({ ...newMaterial, reorder_threshold: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white px-6 py-3 border-t border-slate-200 flex justify-end gap-2.5 z-10 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  id="submit-material-btn"
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 text-xs font-bold bg-[#142B4A] hover:bg-slate-900 text-white rounded-lg shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Material Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Record Movement */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Record Stock {movementForm.movement_type === 'received' ? 'Receipt' : 'Issue / Consumption'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Material: <span className="text-slate-900 font-bold">{selectedMaterial?.yarn_type} ({selectedMaterial?.colour})</span>
                  {' '}• Available: <span className="font-mono text-teal-700 font-bold">{selectedMaterial?.quantity_on_hand} {selectedMaterial?.unit}</span>
                </p>
              </div>
              <button
                onClick={() => setShowMoveModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleRecordMovement} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Movement Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMovementForm({ ...movementForm, movement_type: 'received' })}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                        movementForm.movement_type === 'received'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      + Stock Received
                    </button>
                    <button
                      type="button"
                      onClick={() => setMovementForm({ ...movementForm, movement_type: 'consumed' })}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                        movementForm.movement_type === 'consumed'
                          ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      - Stock Consumed / Issued
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity ({selectedMaterial?.unit || 'kg'})
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="Enter quantity"
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {movementForm.movement_type === 'received' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier / Vendor</label>
                    <select
                      value={movementForm.supplier_id}
                      onChange={(e) => setMovementForm({ ...movementForm, supplier_id: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">-- Select Supplier (Optional) --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Slip Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. Delivery Challan #882 / Issued to Loom SF-01"
                    value={movementForm.notes}
                    onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white px-6 py-3 border-t border-slate-200 flex justify-end gap-2.5 z-10 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  id="submit-movement-btn"
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 text-xs font-bold bg-[#142B4A] hover:bg-slate-900 text-white rounded-lg shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Stock Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
