import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  LayoutDashboard,
  TrendingUp,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Truck,
  DollarSign,
  PackageCheck,
  RefreshCw,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Building,
  Layers,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';

const DEFECT_COLORS = {
  stain: '#E11D48',
  tear: '#F97316',
  weave_flaw: '#D97706',
  colour_variation: '#6366F1',
  other: '#64748B',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/stats');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !data) {
    return (
      <div className="py-28 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-primary-navy/5 border border-primary-navy/10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary-navy" />
        </div>
        <p className="text-sm font-medium text-slate-500">Loading operations telemetry...</p>
      </div>
    );
  }

  // Format defect data for PieChart
  const defectData = data?.quality?.defect_breakdown
    ? Object.entries(data.quality.defect_breakdown)
        .filter(([_, count]) => count > 0)
        .map(([key, count]) => ({
          name: key.replace('_', ' ').toUpperCase(),
          value: count,
          color: DEFECT_COLORS[key] || '#64748B',
        }))
    : [];

  // Financial comparison bar chart
  const financeChartData = data?.finance
    ? [
        {
          name: 'P&L Breakdown',
          Revenue: data.finance.total_revenue,
          OperatingCost: data.finance.total_cost,
          GrossProfit: data.finance.gross_profit,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 tracking-wide uppercase">
              Operations Telemetry
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">Real-Time Floor Sync</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">Everest Textile Mills Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time shop-floor operational status, machine fleet utilization, defect analysis, and financial health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Sync</span>
          </div>

          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh operations telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-navy' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Row 1: Operations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer Orders</span>
            <span className="p-2 bg-sky-50 text-sky-700 border border-sky-100 rounded-lg">
              <LayoutDashboard className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 font-mono tracking-tight">{data?.total_orders || 0}</div>
          <div className="flex items-center gap-1.5 text-xs text-teal-700 font-medium mt-2 bg-teal-50/80 px-2 py-0.5 rounded border border-teal-100 w-fit">
            <Activity className="w-3 h-3" />
            <span>{data?.active_orders || 0} active in production</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fabric Produced</span>
            <span className="p-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 font-mono tracking-tight">
            {(data?.total_produced_metres || 0).toLocaleString()} <span className="text-sm font-sans font-normal text-slate-500">m</span>
          </div>
          <div className="text-xs text-slate-500 mt-2 font-medium">
            {data?.quality?.total_rolls || 0} serialized rolls tracked
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fabric Dispatched</span>
            <span className="p-2 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-purple-700 mt-3 font-mono tracking-tight">
            {(data?.total_dispatched_metres || 0).toLocaleString()} <span className="text-sm font-sans font-normal text-slate-500">m</span>
          </div>
          <div className="text-xs text-slate-500 mt-2 font-medium">
            Verified with Delivery Challans
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quality Pass Rate</span>
            <span className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-3 font-mono tracking-tight">
            {data?.quality?.pass_rate_pct || 0}%
          </div>
          <div className="text-xs text-slate-500 mt-2 font-medium">
            {data?.quality?.passed_count || 0} passed / {data?.quality?.total_inspected || 0} checked
          </div>
        </div>
      </div>

      {/* KPI Cards Row 2: Financial Health */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contract Revenue</span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 font-mono tracking-tight">
            ${(data?.finance?.total_revenue || 0).toLocaleString()}
          </div>
          <div className="text-xs text-emerald-700 font-medium mt-1">
            ${(data?.finance?.total_collected || 0).toLocaleString()} collected
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Factory Cost</span>
          <div className="text-xl sm:text-2xl font-bold text-rose-600 mt-2 font-mono tracking-tight">
            ${(data?.finance?.total_cost || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">Materials + labour + overhead</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Gross Profit</span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-2 font-mono tracking-tight">
            ${(data?.finance?.gross_profit || 0).toLocaleString()}
          </div>
          <div className="text-xs text-emerald-800 font-semibold mt-1">
            {data?.finance?.gross_margin_pct || 0}% profit margin
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Receivables Due</span>
          <div className="text-xl sm:text-2xl font-bold text-amber-700 mt-2 font-mono tracking-tight">
            ${(data?.finance?.total_receivables_due || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">Pending buyer wire settlement</div>
        </div>
      </div>

      {/* Warning Banners if low stock */}
      {data?.low_stock_alerts_count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <AlertTriangle className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                {data.low_stock_alerts_count} Raw Material(s) at or below Reorder Threshold!
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Immediate yarn replenishment recommended to prevent looming production downtime.
              </p>
            </div>
          </div>
          <Link
            to={user?.role === 'accounts' ? "/finance?tab=inventory" : "/inventory"}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
          >
            <span>View Inventory Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Production Volume by Stage */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Production Output by Stage (Metres)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Cumulative linear metres processed through factory machines</p>
            </div>
            <span className="p-1.5 bg-slate-100 text-slate-700 rounded-lg"><Cpu className="w-4 h-4" /></span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.production_by_stage || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="stage" stroke="#64748b" fontSize={12} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#ffffff', fontSize: '12px' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Bar dataKey="metres" fill="#142B4A" radius={[6, 6, 0, 0]} name="Metres" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Defect Distribution Breakdown */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Four-Point Fabric Defect Breakdown
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Logged defects by category from inspection stations</p>
            </div>
            <span className="p-1.5 bg-rose-50 text-rose-700 rounded-lg"><ShieldCheck className="w-4 h-4" /></span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {defectData.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-8">
                Zero recorded defects! All inspected fabric rolls are Grade A.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={defectData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {defectData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#ffffff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Financial Revenue vs Cost */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Factory Financial Performance ($)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Revenue vs Total Manufacturing Costs vs Net Margin</p>
            </div>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg"><DollarSign className="w-4 h-4" /></span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#ffffff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="Revenue" fill="#142B4A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="OperatingCost" fill="#E11D48" radius={[4, 4, 0, 0]} />
                <Bar dataKey="GrossProfit" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Machine Fleet Health Widget */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Machine Fleet Utilization
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Looms, spinning frames, and dyeing vats</p>
              </div>
              <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg"><Cpu className="w-4 h-4" /></span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Running</span>
                  <div className="text-2xl font-bold text-emerald-950 font-mono mt-1">
                    {data?.machine_fleet?.running || 0}
                  </div>
                </div>
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
              </div>

              <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-sky-800 font-bold uppercase tracking-wider">Idle (Standby)</span>
                  <div className="text-2xl font-bold text-sky-950 font-mono mt-1">
                    {data?.machine_fleet?.idle || 0}
                  </div>
                </div>
                <span className="w-3 h-3 rounded-full bg-sky-500"></span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">Maintenance</span>
                  <div className="text-2xl font-bold text-amber-950 font-mono mt-1">
                    {data?.machine_fleet?.maintenance || 0}
                  </div>
                </div>
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-rose-800 font-bold uppercase tracking-wider">Error / Stop</span>
                  <div className="text-2xl font-bold text-rose-950 font-mono mt-1">
                    {data?.machine_fleet?.error || 0}
                  </div>
                </div>
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              </div>
            </div>
          </div>

          <Link
            to="/production"
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-200 mt-2"
          >
            <span>Open Production Machine Fleet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Top Buyers Table */}
      {data?.top_buyers && data.top_buyers.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Top Fabric Buyers by Order Value
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Highest volume accounts and financial contributions</p>
            </div>
            <Link to="/orders" className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1">
              <span>View All Orders</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Buyer / Consignee</th>
                  <th className="py-3 px-4">Total Fabric Ordered</th>
                  <th className="py-3 px-4 text-right">Total Order Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.top_buyers.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary-navy/5 text-primary-navy flex items-center justify-center">
                        <Building className="w-4 h-4" />
                      </div>
                      <span>{b.buyer_name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{b.total_metres.toLocaleString()} m</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 text-right">
                      ${b.total_revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
