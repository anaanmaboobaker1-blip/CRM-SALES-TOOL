import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import API from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  ArrowUpDown,
  Trash2,
  Edit2,
  CheckSquare,
  FileSpreadsheet,
  Upload,
  MessageSquare,
  CalendarClock,
  AlertTriangle,
  Users
} from 'lucide-react';

function Leads() {
  const { user } = useAuth();
  const location = useLocation();

  // Core Data States
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [salesTeam, setSalesTeam] = useState([]);

  // Pagination & Sorting States
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');

  // Modals Toggles
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Selected Records for Modals
  const [selectedLead, setSelectedLead] = useState(null);
  const [notesList, setNotesList] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [leadForm, setLeadForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    source: 'Website',
    status: 'New',
    priority: 'Medium',
    ownerId: '',
    nextFollowUp: '',
  });

  // Conversion Form
  const [convertForm, setConvertForm] = useState({
    createDeal: false,
    dealName: '',
    dealValue: '',
    expectedClosingDate: '',
  });

  // Activity Form
  const [activityForm, setActivityForm] = useState({
    title: '',
    type: 'Call',
    dueDate: '',
    priority: 'Medium',
    notes: '',
  });

  // Import File state
  const [importFile, setImportFile] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Fetch Team and Leads
  const fetchLeads = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await API.get('/leads', {
        params: {
          page,
          limit,
          sortBy,
          sortOrder,
          search,
          status: statusFilter,
          priority: priorityFilter,
          source: sourceFilter,
          ownerId: ownerFilter,
        },
      });
      setLeads(response.data.data);
      setTotal(response.data.pagination.total);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesTeam = async () => {
    try {
      const response = await API.get('/sales-team');
      setSalesTeam(response.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, sortBy, sortOrder, statusFilter, priorityFilter, sourceFilter, ownerFilter]);

  // Handle global search triggering
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchLeads();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  useEffect(() => {
    fetchSalesTeam();
    // Check if redirect has query to create lead
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'create') {
      openAddLeadModal();
    }
  }, [location]);

  // Sorting Handler
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Create/Edit Handler
  const openAddLeadModal = () => {
    setSelectedLead(null);
    setLeadForm({
      name: '',
      company: '',
      phone: '',
      email: '',
      source: 'Website',
      status: 'New',
      priority: 'Medium',
      ownerId: user.role === 'Salesperson' ? user.id : '',
      nextFollowUp: '',
    });
    setErrorMessage(null);
    setShowAddEditModal(true);
  };

  const openEditLeadModal = (lead) => {
    setSelectedLead(lead);
    setLeadForm({
      name: lead.name,
      company: lead.company || '',
      phone: lead.phone || '',
      email: lead.email || '',
      source: lead.source,
      status: lead.status,
      priority: lead.priority,
      ownerId: lead.ownerId || '',
      nextFollowUp: lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().substring(0, 10) : '',
    });
    setErrorMessage(null);
    setShowAddEditModal(true);
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const payload = {
        ...leadForm,
        ownerId: leadForm.ownerId ? parseInt(leadForm.ownerId) : null,
        nextFollowUp: leadForm.nextFollowUp ? new Date(leadForm.nextFollowUp).toISOString() : null,
      };

      if (selectedLead) {
        await API.put(`/leads/${selectedLead.id}`, payload);
      } else {
        await API.post('/leads', payload);
      }
      setShowAddEditModal(false);
      fetchLeads();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save lead');
    }
  };

  // Delete Handler
  const handleDeleteLead = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete lead "${name}"?`)) {
      try {
        await API.delete(`/leads/${id}`);
        fetchLeads();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Notes Handler
  const openNotesModal = async (lead) => {
    setSelectedLead(lead);
    setShowNotesModal(true);
    setNewNote('');
    try {
      const response = await API.get(`/leads/${lead.id}`);
      setNotesList(response.data.data.notes || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      const response = await API.post(`/leads/${selectedLead.id}/notes`, { note: newNote });
      setNotesList([response.data.data, ...notesList]);
      setNewNote('');
    } catch (err) {
      console.error(err);
    }
  };

  // Follow-up Activity Handler
  const openActivityModal = (lead) => {
    setSelectedLead(lead);
    setActivityForm({
      title: 'Follow-up Call',
      type: 'Call',
      dueDate: '',
      priority: 'Medium',
      notes: '',
    });
    setShowActivityModal(true);
  };

  const handleActivitySubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post(`/leads/${selectedLead.id}/activities`, {
        ...activityForm,
        dueDate: new Date(activityForm.dueDate).toISOString(),
      });
      setShowActivityModal(false);
      fetchLeads();
    } catch (err) {
      console.error(err);
    }
  };

  // Conversion Handler
  const openConvertModal = (lead) => {
    setSelectedLead(lead);
    setConvertForm({
      createDeal: false,
      dealName: `${lead.company || lead.name} - Initial Deal`,
      dealValue: '',
      expectedClosingDate: '',
    });
    setShowConvertModal(true);
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        createDeal: convertForm.createDeal,
        dealName: convertForm.createDeal ? convertForm.dealName : undefined,
        dealValue: convertForm.createDeal ? parseFloat(convertForm.dealValue) : undefined,
        expectedClosingDate: convertForm.createDeal && convertForm.expectedClosingDate ? new Date(convertForm.expectedClosingDate).toISOString() : undefined,
      };

      await API.post(`/leads/${selectedLead.id}/convert`, payload);
      setShowConvertModal(false);
      fetchLeads();
    } catch (err) {
      alert(err.response?.data?.message || 'Lead conversion failed');
    }
  };

  // CSV Import handler
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    setImportLoading(true);
    setImportSummary(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const response = await API.post('/import/leads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportSummary(response.data.data);
      fetchLeads();
    } catch (err) {
      alert(err.response?.data?.message || 'CSV Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  // CSV Export handler
  const handleExport = async () => {
    try {
      const response = await API.get('/export/leads', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'leads-export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export leads:', err);
    }
  };

  // Color mappings
  const statusColors = {
    New: 'bg-slate-100 text-slate-700',
    Contacted: 'bg-sky-100 text-sky-700 border-sky-200',
    Qualified: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Lost: 'bg-rose-100 text-rose-700 border-rose-200',
  };

  const priorityColors = {
    Low: 'bg-slate-100 text-slate-600',
    Medium: 'bg-blue-100 text-blue-700',
    High: 'bg-orange-100 text-orange-700',
    Critical: 'bg-red-100 text-red-700 animate-pulse',
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500 mt-1">Manage, capture, and convert sales pipeline prospects.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition"
          >
            <Upload className="h-4 w-4" /> Import CSV
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </button>
          {user.role !== 'View Only' && (
            <button
              onClick={openAddLeadModal}
              className="flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition"
            >
              <Plus className="h-4 w-4" /> Add Lead
            </button>
          )}
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs outline-none focus:border-teal-500"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
        >
          <option value="">All Statuses</option>
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="Qualified">Qualified</option>
          <option value="Lost">Lost</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
        >
          <option value="">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
        >
          <option value="">All Sources</option>
          <option value="Website">Website</option>
          <option value="Social Media">Social Media</option>
          <option value="Referral">Referral</option>
          <option value="Advertisement">Advertisement</option>
          <option value="Email">Email</option>
          <option value="Phone">Phone</option>
          <option value="Walk-in">Walk-in</option>
          <option value="Other">Other</option>
        </select>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
        >
          <option value="">All Owners</option>
          {salesTeam.map(sp => (
            <option key={sp.id} value={sp.id}>{sp.name}</option>
          ))}
        </select>
      </div>

      {/* LEADS DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Users className="h-12 w-12 mx-auto mb-4 stroke-1 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">No leads found</h3>
            <p className="text-xs text-slate-500 mt-1">Try modifying your filter options or add a new lead.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <th onClick={() => handleSort('id')} className="py-4 px-6 cursor-pointer hover:bg-slate-100 select-none">
                    Lead ID <ArrowUpDown className="inline h-3 w-3 ml-1" />
                  </th>
                  <th onClick={() => handleSort('name')} className="py-4 px-6 cursor-pointer hover:bg-slate-100 select-none">
                    Name <ArrowUpDown className="inline h-3 w-3 ml-1" />
                  </th>
                  <th className="py-4 px-6">Company</th>
                  <th className="py-4 px-6">Contact Info</th>
                  <th className="py-4 px-6">Source</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Priority</th>
                  <th className="py-4 px-6">Owner</th>
                  <th className="py-4 px-6">Next Follow-up</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-6 font-semibold text-slate-900">LD-{String(lead.id).padStart(5, '0')}</td>
                    <td className="py-4 px-6 font-bold">{lead.name}</td>
                    <td className="py-4 px-6">{lead.company || '—'}</td>
                    <td className="py-4 px-6">
                      <div>{lead.email}</div>
                      <div className="text-[10px] text-slate-400">{lead.phone}</div>
                    </td>
                    <td className="py-4 px-6">{lead.source}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[lead.status]}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityColors[lead.priority]}`}>
                        {lead.priority}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium">{lead.owner ? lead.owner.name : 'Unassigned'}</td>
                    <td className="py-4 px-6 text-slate-500">
                      {lead.nextFollowUp ? new Date(lead.nextFollowUp).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openNotesModal(lead)}
                          title="Lead Notes"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                        {user.role !== 'View Only' && !lead.convertedAt && (
                          <>
                            <button
                              onClick={() => openActivityModal(lead)}
                              title="Schedule Activity"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <CalendarClock className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openConvertModal(lead)}
                              title="Convert Lead"
                              className="rounded-lg p-1.5 text-emerald-500 hover:bg-emerald-50"
                            >
                              <CheckSquare className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditLeadModal(lead)}
                              title="Edit Lead"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteLead(lead.id, lead.name)}
                              title="Delete Lead"
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {lead.convertedAt && (
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                            Converted
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* PAGINATION PANEL */}
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
              <span className="text-slate-500 text-xs">Total items: <strong className="text-slate-900">{total}</strong></span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={page * limit >= total}
                  onClick={() => setPage(page + 1)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- ADD / EDIT LEAD MODAL --- */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">{selectedLead ? 'Edit Lead' : 'Add New Lead'}</h3>
              <button onClick={() => setShowAddEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {errorMessage && (
              <div className="my-4 rounded-lg bg-rose-50 border border-rose-100 p-3 text-xs text-rose-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> {errorMessage}
              </div>
            )}

            <form onSubmit={handleLeadSubmit} className="mt-4 space-y-4 text-slate-800">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Company / Organization</label>
                  <input
                    type="text"
                    value={leadForm.company}
                    onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Source *</label>
                  <select
                    value={leadForm.source}
                    onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  >
                    <option value="Website">Website</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Referral">Referral</option>
                    <option value="Advertisement">Advertisement</option>
                    <option value="Email">Email</option>
                    <option value="Phone">Phone</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Status *</label>
                  <select
                    value={leadForm.status}
                    onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Priority *</label>
                  <select
                    value={leadForm.priority}
                    onChange={(e) => setLeadForm({ ...leadForm, priority: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Owner Assignment</label>
                  <select
                    value={leadForm.ownerId}
                    onChange={(e) => setLeadForm({ ...leadForm, ownerId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  >
                    <option value="">Select salesperson...</option>
                    {salesTeam.map(sp => (
                      <option key={sp.id} value={sp.id}>{sp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Next Follow-up Date</label>
                  <input
                    type="date"
                    value={leadForm.nextFollowUp}
                    onChange={(e) => setLeadForm({ ...leadForm, nextFollowUp: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-500 hover:bg-teal-600 px-6 py-2 text-xs font-semibold text-white"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- LEAD CONVERT MODAL --- */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-slate-800">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Convert Lead</h3>
            <p className="text-xs text-slate-500 mt-2">
              Converting lead <strong>{selectedLead?.name}</strong> will create a Customer and primary Contact record.
            </p>
            <form onSubmit={handleConvertSubmit} className="mt-4 space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={convertForm.createDeal}
                  onChange={(e) => setConvertForm({ ...convertForm, createDeal: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs font-semibold text-slate-700">Create a Deal for this Customer</span>
              </label>

              {convertForm.createDeal && (
                <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100 animate-fadeIn">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Deal Name *</label>
                    <input
                      type="text"
                      required
                      value={convertForm.dealName}
                      onChange={(e) => setConvertForm({ ...convertForm, dealName: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 py-1.5 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Deal Value (INR) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={convertForm.dealValue}
                      onChange={(e) => setConvertForm({ ...convertForm, dealValue: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 py-1.5 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Expected Closing Date</label>
                    <input
                      type="date"
                      value={convertForm.expectedClosingDate}
                      onChange={(e) => setConvertForm({ ...convertForm, expectedClosingDate: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 py-1.5 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-500 hover:bg-teal-600 px-6 py-2 text-xs font-semibold text-white"
                >
                  Convert Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- LEAD NOTES MODAL --- */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl text-slate-800 flex flex-col max-h-[80vh]">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Notes - {selectedLead?.name}</h3>
            
            {/* Notes List */}
            <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1">
              {notesList.map((n) => (
                <div key={n.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-600">{n.user.name}</span>
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">{n.note}</p>
                </div>
              ))}
              {notesList.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs">No notes logged yet.</div>
              )}
            </div>

            {/* Note form */}
            {user.role !== 'View Only' && (
              <form onSubmit={handleAddNote} className="mt-4 border-t border-slate-100 pt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Type note and press Add..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-teal-500 hover:bg-teal-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  Add
                </button>
              </form>
            )}

            <div className="flex justify-end mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowNotesModal(false)}
                className="rounded-xl border border-slate-200 px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SCHEDULE ACTIVITY MODAL --- */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-slate-800">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Schedule Follow-up</h3>
            <form onSubmit={handleActivitySubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Type *</label>
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
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Notes / Description</label>
                <textarea
                  rows="3"
                  value={activityForm.notes}
                  onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-500 hover:bg-teal-600 px-6 py-2 text-xs font-semibold text-white"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CSV IMPORT MODAL --- */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Import Leads from CSV</h3>
              <button onClick={() => { setShowImportModal(false); setImportSummary(null); setImportFile(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleImportSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-2">Select CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                />
              </div>
              
              <button
                type="submit"
                disabled={importLoading || !importFile}
                className="w-full rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-slate-200 py-2 px-4 text-xs font-semibold text-white transition"
              >
                {importLoading ? 'Processing...' : 'Upload and Validate'}
              </button>
            </form>

            {/* Import Summary Results */}
            {importSummary && (
              <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <h4 className="font-bold text-slate-800 mb-2">Import Results:</h4>
                <div className="grid grid-cols-3 gap-2 text-center py-2">
                  <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg font-semibold">
                    <div>{importSummary.successCount}</div>
                    <div className="text-[10px] font-medium text-emerald-600">Success</div>
                  </div>
                  <div className="bg-amber-50 text-amber-700 p-2 rounded-lg font-semibold">
                    <div>{importSummary.duplicateCount}</div>
                    <div className="text-[10px] font-medium text-amber-600">Duplicates</div>
                  </div>
                  <div className="bg-rose-50 text-rose-700 p-2 rounded-lg font-semibold">
                    <div>{importSummary.failedCount}</div>
                    <div className="text-[10px] font-medium text-rose-600">Failed</div>
                  </div>
                </div>

                {importSummary.failures.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-bold text-slate-700 mb-1.5">Failures & Warnings:</h5>
                    <div className="max-h-36 overflow-y-auto space-y-1.5">
                      {importSummary.failures.map((f, idx) => (
                        <div key={idx} className="bg-white p-2 rounded border border-slate-100 text-[10px]">
                          <strong>Line {f.line}:</strong> {f.name} - <span className="text-rose-500">{f.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// X Icon helper
function X(props) {
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

export default Leads;
