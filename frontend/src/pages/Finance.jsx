import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  CreditCard,
  PlusCircle,
  Search,
  RefreshCw,
  Loader2,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Finance() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'expenses' | 'payments'
  const [summaries, setSummaries] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Forms
  const [expenseForm, setExpenseForm] = useState({
    category: 'dye_chemicals',
    amount: '',
    description: '',
    order_id: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    order_id: '',
    amount: '',
    payment_method: 'bank_transfer',
    status: 'received',
    transaction_reference: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const canManageFinance = ['admin', 'accounts'].includes(user?.role);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, expRes, payRes] = await Promise.all([
        api.get('/finance/order-summaries'),
        api.get('/finance/expenses'),
        api.get('/finance/payments'),
      ]);
      setSummaries(sumRes.data);
      setExpenses(expRes.data);
      setPayments(payRes.data);
    } catch (err) {
      console.error('Failed to load finance data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecordExpense = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg('');

      const payload = {
        category: expenseForm.category,
        amount: parseFloat(expenseForm.amount),
        description: expenseForm.description,
        order_id: expenseForm.order_id ? parseInt(expenseForm.order_id) : null,
      };

      await api.post('/finance/expenses', payload);
      setSuccessMsg('Expense entry recorded successfully!');
      setShowExpenseModal(false);
      setExpenseForm({ category: 'dye_chemicals', amount: '', description: '', order_id: '' });
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.order_id) {
      setErrorMsg('Please select an order');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const payload = {
        order_id: parseInt(paymentForm.order_id),
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        status: paymentForm.status,
        transaction_reference: paymentForm.transaction_reference,
      };

      await api.post('/finance/payments', payload);
      setSuccessMsg('Payment transaction logged successfully!');
      setShowPaymentModal(false);
      setPaymentForm({
        order_id: '',
        amount: '',
        payment_method: 'bank_transfer',
        status: 'received',
        transaction_reference: '',
      });
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  // KPI aggregates
  const totalRevenue = summaries.reduce((acc, s) => acc + s.total_revenue, 0);
  const totalCost = summaries.reduce((acc, s) => acc + s.total_cost, 0);
  const totalGrossProfit = summaries.reduce((acc, s) => acc + s.gross_profit, 0);
  const avgGrossMargin = totalRevenue > 0 ? ((totalGrossProfit / totalRevenue) * 100).toFixed(1) : 0;
  const totalCollected = summaries.reduce((acc, s) => acc + s.total_paid, 0);
  const totalDue = summaries.reduce((acc, s) => acc + s.balance_due, 0);

  const filteredSummaries = summaries.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.order_number.toLowerCase().includes(q) ||
      s.buyer_name.toLowerCase().includes(q) ||
      s.fabric_type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase tracking-wider">
            Finance & Profitability
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-2">Cost Accounting & Profit Ledger</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Order cost analysis (yarn materials + direct expenses), gross margins, and buyer payment reconciliations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canManageFinance && (
            <>
              <button
                onClick={() => {
                  setErrorMsg('');
                  setShowExpenseModal(true);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Log Expense</span>
              </button>

              <button
                onClick={() => {
                  setErrorMsg('');
                  setShowPaymentModal(true);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            </>
          )}

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white"
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
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Contract Revenue</span>
          <div className="text-xl font-bold text-white mt-1 font-mono">${totalRevenue.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">{summaries.length} orders</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-rose-400 font-medium">Estimated Cost</span>
          <div className="text-xl font-bold text-rose-400 mt-1 font-mono">${totalCost.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">Yarn & direct overhead</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-emerald-400 font-medium">Gross Profit</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">${totalGrossProfit.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-500 mt-1">Net gross margin</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-sky-400 font-medium">Average Margin</span>
          <div className="text-xl font-bold text-sky-400 mt-1 font-mono">{avgGrossMargin}%</div>
          <div className="text-[11px] text-slate-500 mt-1">Across all orders</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-indigo-400 font-medium">Payments Collected</span>
          <div className="text-xl font-bold text-white mt-1 font-mono">${totalCollected.toLocaleString()}</div>
          <div className="text-[11px] text-indigo-400 mt-1">{payments.length} receipts</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-amber-400 font-medium">Outstanding Due</span>
          <div className="text-xl font-bold text-amber-400 mt-1 font-mono">${totalDue.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">Receivables pending</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 -mb-px ${
            activeTab === 'orders'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Order Profitability ({summaries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 -mb-px ${
            activeTab === 'expenses'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Direct Expenses Ledger ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 -mb-px ${
            activeTab === 'payments'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Buyer Payment Receipts ({payments.length})</span>
        </button>
      </div>

      {/* TAB 1: ORDER PROFITABILITY */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search order, buyer, fabric..."
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
            ) : filteredSummaries.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No orders found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Buyer & Fabric</th>
                      <th className="py-3 px-4">Revenue</th>
                      <th className="py-3 px-4">Yarn Cost</th>
                      <th className="py-3 px-4">Expenses</th>
                      <th className="py-3 px-4">Total Cost</th>
                      <th className="py-3 px-4">Gross Profit</th>
                      <th className="py-3 px-4">Margin %</th>
                      <th className="py-3 px-4">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredSummaries.map((s) => (
                      <tr key={s.order_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-sky-400">
                          {s.order_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{s.buyer_name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{s.fabric_type} ({s.ordered_metres}m @ ${s.unit_price})</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          ${s.total_revenue.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                          ${s.material_cost.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                          ${s.expenses_cost.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-rose-300 font-semibold">
                          ${s.total_cost.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                          ${s.gross_profit.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-sky-400">
                          {s.gross_margin_pct}%
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                              s.financial_status === 'Paid in Full'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : s.financial_status === 'Partially Paid'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {s.financial_status}
                          </span>
                          {s.balance_due > 0 && (
                            <div className="text-[11px] text-amber-400/80 mt-1 font-mono">
                              Due: ${s.balance_due.toFixed(2)}
                            </div>
                          )}
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

      {/* TAB 2: EXPENSES LEDGER */}
      {activeTab === 'expenses' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No expenses recorded yet. Click "Log Expense" above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Linked Order</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                        {new Date(e.expense_date).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 capitalize border border-slate-700">
                          {e.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-white">
                        {e.description || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-sky-400">
                        {e.order_number || 'General Overhead'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-400 text-right">
                        ${e.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAYMENTS LEDGER */}
      {activeTab === 'payments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            </div>
          ) : payments.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No payments recorded yet. Click "Record Payment" above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Buyer</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                        {new Date(p.payment_date).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-400">
                        {p.order_number}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white">
                        {p.buyer_name}
                      </td>
                      <td className="py-3.5 px-4 text-xs capitalize text-slate-300">
                        {p.payment_method.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                        {p.transaction_reference || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            p.status === 'received'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-right">
                        +${p.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Log Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-400" />
                <span>Log Direct Operating Expense</span>
              </h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-300 rounded-xl text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRecordExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Expense Category *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="raw_materials">Raw Materials (Yarn / Fiber)</option>
                  <option value="dye_chemicals">Dyes, Bleaches & Auxiliary Chemicals</option>
                  <option value="electricity">Power & Utilities</option>
                  <option value="labour">Direct Labour Charges</option>
                  <option value="maintenance">Loom & Spindle Maintenance</option>
                  <option value="transport">Freight & Transportation</option>
                  <option value="other">Other Factory Overhead</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 450.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Link to Customer Order (Optional)</label>
                <select
                  value={expenseForm.order_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, order_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">General Overhead (Not Order-Specific)</option>
                  {summaries.map((s) => (
                    <option key={s.order_id} value={s.order_id}>
                      {s.order_number} ({s.buyer_name} - {s.fabric_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description / Memo</label>
                <input
                  type="text"
                  placeholder="e.g. Purchase of 50kg Reactive Navy Blue Dye"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span>Record Buyer Payment</span>
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-300 rounded-xl text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Select Customer Order *</label>
                <select
                  required
                  value={paymentForm.order_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, order_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">-- Choose Order --</option>
                  {summaries.map((s) => (
                    <option key={s.order_id} value={s.order_id}>
                      {s.order_number} ({s.buyer_name} - Rev: ${s.total_revenue}, Due: ${s.balance_due})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Amount Received ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 2500.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Payment Method *</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="bank_transfer">Bank Wire / RTGS</option>
                    <option value="cheque">Bank Cheque</option>
                    <option value="cash">Cash</option>
                    <option value="credit">Letter of Credit (LC)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Transaction Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-941824"
                    value={paymentForm.transaction_reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
