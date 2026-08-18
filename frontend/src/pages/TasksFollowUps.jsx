import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import API from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  CalendarCheck,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  Contact,
  ClipboardList
} from 'lucide-react';

function TasksFollowUps() {
  const { user } = useAuth();
  const location = useLocation();

  // Data states
  const [activities, setActivities] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [salesTeam, setSalesTeam] = useState([]);
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [deals, setDeals] = useState([]);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending'); // default to pending
  const [priorityFilter, setPriorityFilter] = useState('');
  const [timelineFilter, setTimelineFilter] = useState(''); // today, upcoming, overdue

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [activityForm, setActivityForm] = useState({
    title: '',
    type: 'Call',
    relatedLeadId: '',
    relatedCustomerId: '',
    relatedDealId: '',
    assignedEmployeeId: '',
    dueDate: '',
    priority: 'Medium',
    status: 'Pending',
    notes: '',
  });

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const response = await API.get('/activities', {
        params: {
          page,
          limit,
          search,
          type: typeFilter,
          status: statusFilter,
          priority: priorityFilter,
          timelineFilter,
        },
      });
      setActivities(response.data.data);
      setTotal(response.data.pagination.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAssociations = async () => {
    try {
      const [teamRes, leadsRes, customersRes, dealsRes] = await Promise.all([
        API.get('/sales-team'),
        API.get('/leads', { params: { limit: 100 } }),
        API.get('/customers', { params: { limit: 100 } }),
        API.get('/deals', { params: { limit: 100 } }),
      ]);
      setSalesTeam(teamRes.data.data);
      setLeads(leadsRes.data.data);
      setCustomers(customersRes.data.data);
      setDeals(dealsRes.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [page, typeFilter, statusFilter, priorityFilter, timelineFilter]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchActivities();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  useEffect(() => {
    loadAssociations();
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'create') {
      openAddModal();
    }
  }, [location]);

  const openAddModal = () => {
    setActivityForm({
      title: '',
      type: 'Call',
      relatedLeadId: '',
      relatedCustomerId: '',
      relatedDealId: '',
      assignedEmployeeId: user.role === 'Salesperson' ? user.id : '',
      dueDate: '',
      priority: 'Medium',
      status: 'Pending',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...activityForm,
        relatedLeadId: activityForm.relatedLeadId ? parseInt(activityForm.relatedLeadId) : null,
        relatedCustomerId: activityForm.relatedCustomerId ? parseInt(activityForm.relatedCustomerId) : null,
        relatedDealId: activityForm.relatedDealId ? parseInt(activityForm.relatedDealId) : null,
        assignedEmployeeId: activityForm.assignedEmployeeId ? parseInt(activityForm.assignedEmployeeId) : null,
        dueDate: activityForm.dueDate ? new Date(activityForm.dueDate).toISOString() : null,
      };

      await API.post('/activities', payload);
      setShowAddModal(false);
      fetchActivities();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleComplete = async (id, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
      await API.patch(`/activities/${id}/status`, { status: nextStatus });
      fetchActivities();
    } catch (err) {
      console.error(err);
    }
  };

  const priorityBadge = {
    Low: 'bg-slate-100 text-slate-600',
    Medium: 'bg-blue-100 text-blue-700',
    High: 'bg-orange-100 text-orange-700',
    Critical: 'bg-red-100 text-red-700 font-bold',
  };

  const typeIcon = {
    Call: '📞',
    Meeting: '🤝',
    Task: '📝',
    'Follow-up': '🔔',
    Email: '✉️',
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tasks & Follow-ups</h1>
          <p className="text-sm text-slate-500 mt-1">Manage scheduled customer check-ins and operational call-logs.</p>
        </div>
        {user.role !== 'View Only' && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition"
          >
            <Plus className="h-4 w-4" /> Add Task
          </button>
        )}
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search activities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs outline-none focus:border-teal-500"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select
          value={timelineFilter}
          onChange={(e) => setTimelineFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
        >
          <option value="">All Timeframes</option>
          <option value="today">Today's Schedule</option>
          <option value="upcoming">Upcoming Follow-ups</option>
          <option value="overdue">Overdue Tasks</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
        >
          <option value="">All Types</option>
          <option value="Call">Call</option>
          <option value="Meeting">Meeting</option>
          <option value="Task">Task</option>
          <option value="Follow-up">Follow-up</option>
          <option value="Email">Email</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
        >
          <option value="">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </div>

      {/* ACTIVITIES CHECKLIST LIST */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-slate-800">
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 stroke-1 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">No activities scheduled</h3>
            <p className="text-xs text-slate-500 mt-1">Add a new follow-up callback or meeting reminder.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activities.map((act) => {
              const isOverdue = act.status === 'Pending' && new Date(act.dueDate) < new Date();
              return (
                <div key={act.id} className="p-5 flex items-start gap-4 hover:bg-slate-50/50 transition">
                  {/* Action checkbox toggle */}
                  {user.role !== 'View Only' ? (
                    <button
                      onClick={() => toggleComplete(act.id, act.status)}
                      className="mt-0.5 text-slate-300 hover:text-teal-600 transition"
                    >
                      {act.status === 'Completed' ? (
                        <CheckCircle className="h-5 w-5 text-teal-500" />
                      ) : (
                        <span className="h-5 w-5 block rounded-full border-2 border-slate-200 hover:border-teal-500 bg-white"></span>
                      )}
                    </button>
                  ) : (
                    <span className="mt-1 h-2 w-2 rounded-full bg-slate-300"></span>
                  )}

                  {/* Task details */}
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base">{typeIcon[act.type] || '📝'}</span>
                      <h4 className={`font-bold text-slate-900 text-sm ${act.status === 'Completed' ? 'line-through text-slate-400' : ''}`}>
                        {act.title}
                      </h4>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityBadge[act.priority]}`}>
                        {act.priority}
                      </span>
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-rose-100">
                          <AlertCircle className="h-3 w-3" /> Overdue
                        </span>
                      )}
                    </div>

                    <p className="text-slate-500 mt-1 text-[11px] leading-relaxed">{act.notes || 'No description logged.'}</p>

                    {/* Meta information row */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-[10px] text-slate-400 font-medium">
                      <div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Due: {act.dueDate ? new Date(act.dueDate).toLocaleString() : 'N/A'}</div>
                      <div className="flex items-center gap-1"><Contact className="h-3.5 w-3.5" /> Assigned to: {act.assignedEmployee ? act.assignedEmployee.name : 'Unassigned'}</div>
                      
                      {/* Relations */}
                      {act.lead && (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Lead: {act.lead.name}</span>
                      )}
                      {act.customer && (
                        <span className="bg-teal-50 text-teal-600 px-2 py-0.5 rounded">Customer: {act.customer.name}</span>
                      )}
                      {act.deal && (
                        <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">Deal: {act.deal.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- ADD ACTIVITY TASK MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Schedule Activity Task</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateActivity} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Subject Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Discuss onboarding scope"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Activity Type *</label>
                  <select
                    value={activityForm.type}
                    onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="Call">Call</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Task">Task</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Email">Email</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Priority *</label>
                  <select
                    value={activityForm.priority}
                    onChange={(e) => setActivityForm({ ...activityForm, priority: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Due Date *</label>
                <input
                  type="datetime-local"
                  required
                  value={activityForm.dueDate}
                  onChange={(e) => setActivityForm({ ...activityForm, dueDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                />
              </div>

              {/* Linking relations optional */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px]">
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-1">Relate Lead</label>
                  <select
                    value={activityForm.relatedLeadId}
                    onChange={(e) => setActivityForm({ ...activityForm, relatedLeadId: e.target.value })}
                    className="w-full rounded border border-slate-200 py-1 px-1 bg-white outline-none"
                  >
                    <option value="">None</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-1">Relate Customer</label>
                  <select
                    value={activityForm.relatedCustomerId}
                    onChange={(e) => setActivityForm({ ...activityForm, relatedCustomerId: e.target.value })}
                    className="w-full rounded border border-slate-200 py-1 px-1 bg-white outline-none"
                  >
                    <option value="">None</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-1">Relate Deal</label>
                  <select
                    value={activityForm.relatedDealId}
                    onChange={(e) => setActivityForm({ ...activityForm, relatedDealId: e.target.value })}
                    className="w-full rounded border border-slate-200 py-1 px-1 bg-white outline-none"
                  >
                    <option value="">None</option>
                    {deals.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Assignee</label>
                <select
                  value={activityForm.assignedEmployeeId}
                  onChange={(e) => setActivityForm({ ...activityForm, assignedEmployeeId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                >
                  <option value="">Select salesperson...</option>
                  {salesTeam.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Notes Description</label>
                <textarea
                  rows="2"
                  value={activityForm.notes}
                  onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-500 hover:bg-teal-600 px-6 py-2 text-xs font-semibold text-white"
                >
                  Schedule Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function XIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export default TasksFollowUps;
