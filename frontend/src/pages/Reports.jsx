import React, { useState, useEffect } from 'react';
import API from '../api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  FileText,
  CalendarCheck,
  CheckCircle,
  HelpCircle,
  Users
} from 'lucide-react';

const COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#64748b'];

function Reports() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState('sales');

  // Filters
  const [salespersonFilter, setSalespersonFilter] = useState('');
  const [salesTeam, setSalesTeam] = useState([]);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const response = await API.get('/reports/analytics', {
        params: { salespersonId: salespersonFilter },
      });
      setAnalytics(response.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesTeam = async () => {
    try {
      const response = await API.get('/sales-team');
      setSalesTeam(response.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [salespersonFilter]);

  useEffect(() => {
    fetchSalesTeam();
  }, []);

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  const reportsList = [
    { id: 'sales', label: 'Sales Report', icon: TrendingUp },
    { id: 'leads', label: 'Leads Channel Report', icon: Users },
    { id: 'pipeline', label: 'Pipeline Stage Forecast', icon: BarChart3 },
    { id: 'quotations', label: 'Documents Status Report', icon: FileText },
    { id: 'lost', label: 'Lost Reasons Analysis', icon: HelpCircle },
  ];

  return (
    <div className="space-y-6 text-slate-800 print:bg-white print:p-0">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">CRM Analytical Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Generate tabular summaries and forecast charts across CRM operations.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={printReport}
            className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition"
          >
            Print Report
          </button>
        </div>
      </div>

      {/* FILTERS PANEL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 print:hidden">
        <select
          value={salespersonFilter}
          onChange={(e) => setSalespersonFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
        >
          <option value="">All Team Members</option>
          {salesTeam.map(sp => (
            <option key={sp.id} value={sp.id}>{sp.name}</option>
          ))}
        </select>
      </div>

      {/* REPORT VIEW WRAPPER */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Navigation Sidebar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-3 space-y-1 print:hidden col-span-1">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Available Reports</h4>
          {reportsList.map((rep) => {
            const Icon = rep.icon;
            return (
              <button
                key={rep.id}
                onClick={() => setActiveReport(rep.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-semibold text-left transition ${
                  activeReport === rep.id
                    ? 'bg-teal-500 text-white shadow-md shadow-teal-500/10'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                {rep.label}
              </button>
            );
          })}
        </div>

        {/* Report Main Container */}
        <div className="lg:col-span-3 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-xl font-bold text-slate-900">
              {reportsList.find(r => r.id === activeReport)?.label}
            </h2>
            <p className="text-xs text-slate-500 mt-1">Generated date: {new Date().toLocaleDateString()} | Filter: {salespersonFilter ? 'Specific User' : 'Entire Team'}</p>
          </div>

          {/* REPORT 1: SALES REPORT */}
          {activeReport === 'sales' && (
            <div className="space-y-6">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.monthlySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                    <Bar dataKey="sales" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                    <th className="py-3 px-4">Calendar Month</th>
                    <th className="py-3 px-4 text-right">Won Sales Achieved (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.monthlySales.map(row => (
                    <tr key={row.month} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold">{row.month}</td>
                      <td className="py-3 px-4 text-right font-bold font-mono">₹{row.sales.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* REPORT 2: LEADS BY SOURCE */}
          {activeReport === 'leads' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-sm">Leads Distribution by Ingestion Channel</h4>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-500 font-semibold">
                      <th className="py-2.5 px-4">Channel / Source</th>
                      <th className="py-2.5 px-4 text-right">Prospect Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {analytics.leadsBySource.map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-3 px-4 font-semibold">{row.name}</td>
                        <td className="py-3 px-4 text-right font-bold">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="h-64 flex items-center justify-center bg-slate-50 rounded-2xl border">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.leadsBySource} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#0f766e" label>
                      {analytics.leadsBySource.map((e, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* REPORT 3: PIPELINE FORECAST */}
          {activeReport === 'pipeline' && (
            <div className="space-y-6">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.dealsByStage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="stage" tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                    <th className="py-3 px-4">Funnel Column Stage</th>
                    <th className="py-3 px-4">Opportunity Count</th>
                    <th className="py-3 px-4 text-right">Sum Valuation (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.dealsByStage.map(row => (
                    <tr key={row.stage} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold">{row.stage}</td>
                      <td className="py-3 px-4 font-bold">{row.count}</td>
                      <td className="py-3 px-4 text-right font-bold font-mono">₹{row.value.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* REPORT 4: DOCUMENT STATUS */}
          {activeReport === 'quotations' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-sm">Quotation Documents Pipeline</h4>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-500 font-semibold">
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Draft Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {analytics.quotationsReport.map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-3 px-4 font-semibold">{row.name}</td>
                        <td className="py-3 px-4 text-right font-bold">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-sm">Confirmed Sales Orders</h4>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-500 font-semibold">
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Orders Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {analytics.salesOrdersReport.map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-3 px-4 font-semibold">{row.name}</td>
                        <td className="py-3 px-4 text-right font-bold">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 5: LOST REASONS */}
          {activeReport === 'lost' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Lost Reasons Analytics</h3>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                    <th className="py-3 px-4">Lost Reason Category</th>
                    <th className="py-3 px-4 text-right">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.lostReasonsReport.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold">{row.name}</td>
                      <td className="py-3 px-4 text-right font-bold">{row.value}</td>
                    </tr>
                  ))}
                  {analytics.lostReasonsReport.length === 0 && (
                    <tr>
                      <td colSpan="2" className="text-center py-8 text-slate-400">No lost deals recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default Reports;
