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
  Layers
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
  stain: '#f43f5e',
  tear: '#fb923c',
  weave_flaw: '#eab308',
  colour_variation: '#818cf8',
  other: '#94a3b8',
};

const FLEET_COLORS = {
  running: '#10b981',
  idle: '#38bdf8',
  maintenance: '#f59e0b',
  error: '#ef4444',
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
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
        <p className="text-sm text-slate-400">Loading operations telemetry...</p>
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
          color: DEFECT_COLORS[key] || '#94a3b8',
        }))
    : [];

  // Financial comparison bar chart
  const financeChartData = data?.finance
    ? [
        {
          name: 'Revenue & Costs',
          Revenue: data.finance.total_revenue,
          OperatingCost: data.finance.total_cost,
          GrossProfit: data.finance.gross_profit,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 uppercase tracking-wider">
            Executive Operations Telemetry
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-2">Everest Textile Mills Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time shop-floor operational status, machine fleet utilization, defect analysis, and financial health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live System</span>
          </div>

          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Row 1: Operations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Customer Orders</span>
            <span className="p-1.5 bg-sky-950 text-sky-400 rounded-lg"><LayoutDashboard className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{data?.total_orders || 0}</div>
          <div className="text-[11px] text-sky-400 mt-1">{data?.active_orders || 0} active in production</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Fabric Produced</span>
            <span className="p-1.5 bg-indigo-950 text-indigo-400 rounded-lg"><Layers className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{(data?.total_produced_metres || 0).toLocaleString()} m</div>
          <div className="text-[11px] text-slate-400 mt-1">{data?.quality?.total_rolls || 0} serialized rolls</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Fabric Dispatched</span>
            <span className="p-1.5 bg-purple-950 text-purple-400 rounded-lg"><Truck className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-bold text-purple-400 mt-2 font-mono">{(data?.total_dispatched_metres || 0).toLocaleString()} m</div>
          <div className="text-[11px] text-slate-400 mt-1">To buyer facilities</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Quality Pass Rate</span>
            <span className="p-1.5 bg-emerald-950 text-emerald-400 rounded-lg"><ShieldCheck className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2 font-mono">{data?.quality?.pass_rate_pct || 0}%</div>
          <div className="text-[11px] text-slate-400 mt-1">{data?.quality?.passed_count || 0} passed / {data?.quality?.total_inspected || 0} checked</div>
        </div>
      </div>

      {/* KPI Cards Row 2: Financial Health */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Total Contract Revenue</span>
          <div className="text-xl font-bold text-white mt-1 font-mono">${(data?.finance?.total_revenue || 0).toLocaleString()}</div>
          <div className="text-[11px] text-emerald-400 mt-1">${(data?.finance?.total_collected || 0).toLocaleString()} collected</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-rose-400 font-medium">Total Factory Cost</span>
          <div className="text-xl font-bold text-rose-400 mt-1 font-mono">${(data?.finance?.total_cost || 0).toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">Materials + labour + overhead</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-emerald-400 font-medium">Gross Profit</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">${(data?.finance?.gross_profit || 0).toLocaleString()}</div>
          <div className="text-[11px] text-emerald-500 font-semibold mt-1">{data?.finance?.gross_margin_pct || 0}% margin</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-amber-400 font-medium">Receivables Pending</span>
          <div className="text-xl font-bold text-amber-400 mt-1 font-mono">${(data?.finance?.total_receivables_due || 0).toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">Pending buyer wire transfers</div>
        </div>
      </div>

      {/* Warning Banners if low stock */}
      {data?.low_stock_alerts_count > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-white">
                {data.low_stock_alerts_count} Raw Material(s) at or below Reorder Threshold!
              </h4>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Immediate yarn replenishment recommended to prevent looming production downtime.
              </p>
            </div>
          </div>
          <Link
            to="/inventory"
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0"
          >
            <span>View Inventory Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Recharts Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Production Volume by Stage */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Production Output by Stage (Metres)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Cumulative linear metres processed through factory machines</p>
            </div>
            <span className="p-1.5 bg-sky-950 text-sky-400 rounded-lg"><Cpu className="w-4 h-4" /></span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.production_by_stage || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="stage" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Bar dataKey="metres" fill="#38bdf8" radius={[6, 6, 0, 0]} name="Metres" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Defect Distribution Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Four-Point Fabric Defect Breakdown
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Logged defects by category from inspection station</p>
            </div>
            <span className="p-1.5 bg-rose-950 text-rose-400 rounded-lg"><ShieldCheck className="w-4 h-4" /></span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {defectData.length === 0 ? (
              <div className="text-center text-slate-500 text-xs">
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
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Financial Revenue vs Cost */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Factory Financial Performance ($)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Revenue vs Total Manufacturing Costs vs Net Margin</p>
            </div>
            <span className="p-1.5 bg-emerald-950 text-emerald-400 rounded-lg"><DollarSign className="w-4 h-4" /></span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
                />
                <Legend />
                <Bar dataKey="Revenue" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="OperatingCost" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="GrossProfit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Machine Fleet Health Widget */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Machine Fleet Utilization
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Looms, spinning frames, and dyeing vats</p>
              </div>
              <span className="p-1.5 bg-sky-950 text-sky-400 rounded-lg"><Cpu className="w-4 h-4" /></span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-400 font-semibold uppercase">Running</span>
                  <div className="text-2xl font-bold text-white font-mono mt-1">
                    {data?.machine_fleet?.running || 0}
                  </div>
                </div>
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-sky-400 font-semibold uppercase">Idle (Standby)</span>
                  <div className="text-2xl font-bold text-white font-mono mt-1">
                    {data?.machine_fleet?.idle || 0}
                  </div>
                </div>
                <span className="w-3 h-3 rounded-full bg-sky-400"></span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-400 font-semibold uppercase">Maintenance</span>
                  <div className="text-2xl font-bold text-white font-mono mt-1">
                    {data?.machine_fleet?.maintenance || 0}
                  </div>
                </div>
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-rose-400 font-semibold uppercase">Error / Stoppage</span>
                  <div className="text-2xl font-bold text-white font-mono mt-1">
                    {data?.machine_fleet?.error || 0}
                  </div>
                </div>
                <span className="w-3 h-3 rounded-full bg-rose-400"></span>
              </div>
            </div>
          </div>

          <Link
            to="/production"
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700 mt-2"
          >
            <span>Open Production Machine Fleet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Top Buyers Table */}
      {data?.top_buyers && data.top_buyers.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Top Fabric Buyers by Order Value
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Buyer / Consignee</th>
                  <th className="py-2.5 px-4">Total Fabric Ordered</th>
                  <th className="py-2.5 px-4 text-right">Total Order Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {data.top_buyers.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                      <Building className="w-4 h-4 text-sky-400" />
                      <span>{b.buyer_name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono">{b.total_metres.toLocaleString()} m</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-right">
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
