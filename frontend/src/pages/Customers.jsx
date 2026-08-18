import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  ArrowUpDown,
  Trash2,
  Edit2,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  Building,
  User
} from 'lucide-react';

function Customers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Data states
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [salesTeam, setSalesTeam] = useState([]);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [salespersonFilter, setSalespersonFilter] = useState('');

  // Modal
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [customerForm, setCustomerForm] = useState({
    name: '',
    companyName: '',
    customerType: 'Business',
    phone: '',
    email: '',
    gstin: '',
    billingAddress: '',
    shippingAddress: '',
    customerGroup: 'Enterprise',
    status: 'Active',
    assignedSalespersonId: '',
    tags: '',
  });

  const fetchCustomers = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await API.get('/customers', {
        params: {
          page,
          limit,
          sortBy,
          sortOrder,
          search,
          customerType: typeFilter,
          status: statusFilter,
          assignedSalespersonId: salespersonFilter,
        },
      });
      setCustomers(response.data.data);
      setTotal(response.data.pagination.total);
    } catch (err) {
      console.error(err);
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
    fetchCustomers();
  }, [page, sortBy, sortOrder, typeFilter, statusFilter, salespersonFilter]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCustomers();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  useEffect(() => {
    fetchSalesTeam();
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'create') {
      openAddCustomerModal();
    }
  }, [location]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openAddCustomerModal = () => {
    setSelectedCustomer(null);
    setCustomerForm({
      name: '',
      companyName: '',
      customerType: 'Business',
      phone: '',
      email: '',
      gstin: '',
      billingAddress: '',
      shippingAddress: '',
      customerGroup: 'Enterprise',
      status: 'Active',
      assignedSalespersonId: user.role === 'Salesperson' ? user.id : '',
      tags: '',
    });
    setErrorMessage(null);
    setShowAddEditModal(true);
  };

  const openEditCustomerModal = (customer) => {
    setSelectedCustomer(customer);
    setCustomerForm({
      name: customer.name,
      companyName: customer.companyName || '',
      customerType: customer.customerType,
      phone: customer.phone || '',
      email: customer.email || '',
      gstin: customer.gstin || '',
      billingAddress: customer.billingAddress || '',
      shippingAddress: customer.shippingAddress || '',
      customerGroup: customer.customerGroup || 'Enterprise',
      status: customer.status,
      assignedSalespersonId: customer.assignedSalespersonId || '',
      tags: customer.tags ? customer.tags.map(t => t.tag).join(', ') : '',
    });
    setErrorMessage(null);
    setShowAddEditModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const payload = {
        ...customerForm,
        assignedSalespersonId: customerForm.assignedSalespersonId ? parseInt(customerForm.assignedSalespersonId) : null,
        tags: customerForm.tags ? customerForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };

      if (selectedCustomer) {
        await API.put(`/customers/${selectedCustomer.id}`, payload);
      } else {
        await API.post('/customers', payload);
      }
      setShowAddEditModal(false);
      fetchCustomers();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save customer record');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete customer "${name}"?`)) {
      try {
        await API.delete(`/customers/${id}`);
        fetchCustomers();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleExport = async () => {
    try {
      const response = await API.get('/export/customers', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'customers-export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage active business clients and contact directories.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </button>
          {user.role !== 'View Only' && (
            <button
              onClick={openAddCustomerModal}
              className="flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition"
            >
              <Plus className="h-4 w-4" /> Add Customer
            </button>
          )}
        </div>
      </div>

      {/* FILTER SHEET */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs outline-none focus:border-teal-500"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
        >
          <option value="">All Customer Types</option>
          <option value="Business">Business</option>
          <option value="Individual">Individual</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select
          value={salespersonFilter}
          onChange={(e) => setSalespersonFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
        >
          <option value="">All Assigned Owners</option>
          {salesTeam.map(sp => (
            <option key={sp.id} value={sp.id}>{sp.name}</option>
          ))}
        </select>
      </div>

      {/* CUSTOMERS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-slate-800">
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Eye className="h-12 w-12 mx-auto mb-4 stroke-1 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">No customers found</h3>
            <p className="text-xs text-slate-500 mt-1">Add a new customer account or update filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <th onClick={() => handleSort('id')} className="py-4 px-6 cursor-pointer hover:bg-slate-100 select-none">
                    Customer ID <ArrowUpDown className="inline h-3 w-3 ml-1" />
                  </th>
                  <th onClick={() => handleSort('name')} className="py-4 px-6 cursor-pointer hover:bg-slate-100 select-none">
                    Customer Name <ArrowUpDown className="inline h-3 w-3 ml-1" />
                  </th>
                  <th className="py-4 px-6">Company</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">GSTIN</th>
                  <th className="py-4 px-6">Contact Info</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Assigned Salesperson</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-6 font-semibold">CS-{String(c.id).padStart(5, '0')}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {c.customerType === 'Business' ? (
                          <Building className="h-4 w-4 text-teal-600" />
                        ) : (
                          <User className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="font-bold text-slate-900">{c.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.tags?.map(t => (
                          <span key={t.id} className="bg-slate-100 text-slate-500 text-[9px] font-semibold px-1 rounded">
                            {t.tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium">{c.companyName || '—'}</td>
                    <td className="py-4 px-6">{c.customerType}</td>
                    <td className="py-4 px-6 font-mono text-[11px]">{c.gstin || '—'}</td>
                    <td className="py-4 px-6">
                      <div>{c.email}</div>
                      <div className="text-[10px] text-slate-400">{c.phone}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        c.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium">{c.assignedSalesperson ? c.assignedSalesperson.name : 'Unassigned'}</td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => navigate(`/customers/${c.id}`)}
                          title="View Profile"
                          className="rounded-lg p-1.5 text-teal-600 hover:bg-teal-50"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {user.role !== 'View Only' && (
                          <>
                            <button
                              onClick={() => openEditCustomerModal(c)}
                              title="Edit Customer"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id, c.name)}
                              title="Delete Customer"
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
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

      {/* --- ADD / EDIT CUSTOMER MODAL --- */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">{selectedCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button onClick={() => setShowAddEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            
            {errorMessage && (
              <div className="my-4 rounded-lg bg-rose-50 border border-rose-100 p-3 text-xs text-rose-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-slate-800">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Company Name</label>
                  <input
                    type="text"
                    value={customerForm.companyName}
                    onChange={(e) => setCustomerForm({ ...customerForm, companyName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Customer Type *</label>
                  <select
                    value={customerForm.customerType}
                    onChange={(e) => setCustomerForm({ ...customerForm, customerType: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="Business">Business</option>
                    <option value="Individual">Individual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Customer Group *</label>
                  <select
                    value={customerForm.customerGroup}
                    onChange={(e) => setCustomerForm({ ...customerForm, customerGroup: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="Enterprise">Enterprise</option>
                    <option value="Government">Government</option>
                    <option value="Retail">Retail</option>
                    <option value="Partner">Partner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 29AAAAA1111A1Z1"
                    value={customerForm.gstin}
                    onChange={(e) => setCustomerForm({ ...customerForm, gstin: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Billing Address</label>
                  <textarea
                    rows="2"
                    value={customerForm.billingAddress}
                    onChange={(e) => setCustomerForm({ ...customerForm, billingAddress: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Shipping Address</label>
                  <textarea
                    rows="2"
                    value={customerForm.shippingAddress}
                    onChange={(e) => setCustomerForm({ ...customerForm, shippingAddress: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  ></textarea>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Assigned Salesperson</label>
                  <select
                    value={customerForm.assignedSalespersonId}
                    onChange={(e) => setCustomerForm({ ...customerForm, assignedSalespersonId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="">Select owner...</option>
                    {salesTeam.map(sp => (
                      <option key={sp.id} value={sp.id}>{sp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Tags (Comma Separated)</label>
                  <input
                    type="text"
                    placeholder="VIP, Enterprise, Tech"
                    value={customerForm.tags}
                    onChange={(e) => setCustomerForm({ ...customerForm, tags: e.target.value })}
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
                  Save Record
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

export default Customers;
