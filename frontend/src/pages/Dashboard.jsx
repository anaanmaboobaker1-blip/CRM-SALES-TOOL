import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import {
  UserPlus,
  Users,
  Target,
  BadgeAlert,
  ClipboardList,
  FolderKanban,
  Coins,
  TrendingUp,
  FilePlus2,
  CalendarDays,
  Plus
} from 'lucide-react';

const COLORS = ['#0d9488', '#f43f5e', '#64748b', '#e2e8f0'];

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, analyticsRes] = await Promise.all([
          API.get('/reports/stats'),
          API.get('/reports/analytics'),
        ]);
        setStats(statsRes.data.data);
        setAnalytics(analyticsRes.data.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Could not connect to the backend server. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-rose-50 border border-rose-100 p-8 text-center max-w-xl mx-auto mt-12">
        <BadgeAlert className="h-12 w-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Connection Error</h3>
        <p className="text-sm text-slate-600 mt-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-xl bg-teal-500 hover:bg-teal-600 px-6 py-2 text-sm font-semibold text-white transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Cards layout configurations
  const metricCards = [
    { label: 'Total Leads', value: stats.totalLeads, icon: UserPlus, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Open Deals', value: stats.openDealsCount, icon: FolderKanban, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pipeline Value', value: `₹${stats.pipelineValue.toLocaleString()}`, icon: Coins, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Won Sales', value: `₹${stats.wonSales.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Sales Target (Aug)', value: `₹${stats.salesTarget.toLocaleString()}`, icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Upcoming Activity', value: stats.upcomingActivities, icon: CalendarDays, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Overdue Activity', value: stats.overdueActivities, icon: ClipboardList, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-8">
      {/* HEADER TITLE */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Here is a summary of your sales funnel activity and performance.</p>
        </div>
      </div>

      {/* KPI METRIC CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition hover:shadow-md">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</span>
                <div className={`p-2 rounded-xl ${card.bg} ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-3">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* QUICK ACTION BUTTONS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950 uppercase tracking-wider mb-4">Quick CRM Operations</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => navigate('/leads?action=create')}
            className="flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition"
          >
            <Plus className="h-4 w-4" /> Add Lead
          </button>
          <button
            onClick={() => navigate('/customers?action=create')}
            className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition"
          >
            <Plus className="h-4 w-4" /> Add Customer
          </button>
          <button
            onClick={() => navigate('/deals?action=create')}
            className="flex items-center gap-2 rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition"
          >
            <Plus className="h-4 w-4" /> Create Deal
          </button>
          <button
            onClick={() => navigate('/quotations?action=create')}
            className="flex items-center gap-2 rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition"
          >
            <FilePlus2 className="h-4 w-4" /> Create Quotation
          </button>
          <button
            onClick={() => navigate('/tasks?action=create')}
            className="flex items-center gap-2 rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition"
          >
            <CalendarDays className="h-4 w-4" /> Schedule Follow-up
          </button>
        </div>
      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART 1: SALES PERFORMANCE OVER TIME */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-96">
          <div>
            <h3 className="text-base font-bold text-slate-800">Monthly Sales (Won Deals)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Value of won transactions over the calendar year</p>
          </div>
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.monthlySales}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Sales achieved']} />
                <Area type="monotone" dataKey="sales" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: WON VS LOST PIE */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-96">
          <div>
            <h3 className="text-base font-bold text-slate-800">Deal Success Distribution</h3>
            <p className="text-xs text-slate-400 mt-0.5">Won vs Lost vs Open deals ratios</p>
          </div>
          <div className="h-56 w-full flex items-center justify-center mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.wonVsLost}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analytics.wonVsLost.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2 text-xs font-semibold">
            {analytics.wonVsLost.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="text-slate-500">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 3: LEADERBOARD */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-96">
          <div>
            <h3 className="text-base font-bold text-slate-800">Sales Leaderboard</h3>
            <p className="text-xs text-slate-400 mt-0.5">Total won value by individual salesperson</p>
          </div>
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.leaderboard} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Bar dataKey="value" fill="#0f766e" radius={[0, 8, 8, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: LEADS BY SOURCE */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-96">
          <div>
            <h3 className="text-base font-bold text-slate-800">Leads by Channel</h3>
            <p className="text-xs text-slate-400 mt-0.5">Top performing marketing sources</p>
          </div>
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.leadsBySource}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0d9488" radius={[8, 8, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
