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
  AlertTriangle,
  FolderKanban,
  Trash,
  PlusCircle,
  FileText
} from 'lucide-react';

function Deals() {
  const { user } = useAuth();
  const location = useLocation();

  // Data states
  const [deals, setDeals] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [salesTeam, setSalesTeam] = useState([]);
  const [inventoryProducts, setInventoryProducts] = useState([]);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [salespersonFilter, setSalespersonFilter] = useState('');

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [dealForm, setDealForm] = useState({
    name: '',
    customerId: '',
    contactId: '',
    dealValue: '',
    dealStage: 'Qualification',
    probability: 20,
    expectedClosingDate: '',
    salespersonId: '',
    status: 'Open',
    lostReason: '',
    products: [],
  });

  const fetchDeals = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await API.get('/deals', {
        params: {
          page,
          limit,
          sortBy,
          sortOrder,
          search,
          dealStage: stageFilter,
          salespersonId: salespersonFilter,
        },
      });
      setDeals(response.data.data);
      setTotal(response.data.pagination.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await API.get('/customers', { params: { limit: 100 } });
      setCustomers(response.data.data);
    } catch (err) {
      console.error(err);
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

  const fetchInventory = async () => {
    try {
      const response = await API.get('/integrations/products');
      setInventoryProducts(response.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [page, sortBy, sortOrder, stageFilter, salespersonFilter]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchDeals();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  useEffect(() => {
    fetchCustomers();
    fetchSalesTeam();
    fetchInventory();

    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'create') {
      openAddDealModal();
    } else if (params.get('id')) {
      // Focus on specific deal if requested
      const dealId = parseInt(params.get('id'));
      if (dealId) {
        // Find in loaded list or load details
        API.get(`/deals/${dealId}`).then(res => {
          openEditDealModal(res.data.data);
        }).catch(e => console.error(e));
      }
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

  const openAddDealModal = () => {
    setSelectedDeal(null);
    setDealForm({
      name: '',
      customerId: '',
      contactId: '',
      dealValue: '0',
      dealStage: 'New',
      probability: 10,
      expectedClosingDate: '',
      salespersonId: user.role === 'Salesperson' ? user.id : '',
      status: 'Open',
      lostReason: '',
      products: [],
    });
    setErrorMessage(null);
    setShowAddEditModal(true);
  };

  const openEditDealModal = (deal) => {
    setSelectedDeal(deal);
    setDealForm({
      name: deal.name,
      customerId: deal.customerId,
      contactId: deal.contactId || '',
      dealValue: String(deal.dealValue),
      dealStage: deal.dealStage,
      probability: deal.probability,
      expectedClosingDate: deal.expectedClosingDate ? new Date(deal.expectedClosingDate).toISOString().substring(0, 10) : '',
      salespersonId: deal.salespersonId || '',
      status: deal.status,
      lostReason: deal.lostReason || '',
      products: deal.products || [],
    });
    setErrorMessage(null);
    setShowAddEditModal(true);
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...dealForm.products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value,
    };
    
    // Live calculate totals
    const qty = parseFloat(updatedProducts[index].quantity) || 0;
    const price = parseFloat(updatedProducts[index].unitPrice) || 0;
    const disc = parseFloat(updatedProducts[index].discount) || 0;
    const tax = parseFloat(updatedProducts[index].tax) || 0;
    
    const base = qty * price;
    const total = base * (1 - disc / 100) * (1 + tax / 100);
    updatedProducts[index].total = total;

    // Sum all products to auto-set dealValue
    const sumVal = updatedProducts.reduce((sum, p) => sum + (p.total || 0), 0);

    setDealForm({
      ...dealForm,
      products: updatedProducts,
      dealValue: String(sumVal),
    });
  };

  const selectInventoryProduct = (index, sku) => {
    const matched = inventoryProducts.find(p => p.sku === sku);
    if (matched) {
      handleProductChange(index, 'name', matched.name);
      handleProductChange(index, 'unitPrice', matched.price);
    }
  };

  const addProductRow = () => {
    setDealForm({
      ...dealForm,
      products: [...dealForm.products, { sku: '', name: '', quantity: 1, unitPrice: 0, discount: 0, tax: 18, total: 0 }],
    });
  };

  const removeProductRow = (index) => {
    const updated = dealForm.products.filter((_, idx) => idx !== index);
    const sumVal = updated.reduce((sum, p) => sum + (p.total || 0), 0);
    setDealForm({
      ...dealForm,
      products: updated,
      dealValue: String(sumVal),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const payload = {
        ...dealForm,
        customerId: parseInt(dealForm.customerId),
        contactId: dealForm.contactId ? parseInt(dealForm.contactId) : null,
        dealValue: parseFloat(dealForm.dealValue) || 0,
        probability: parseFloat(dealForm.probability),
        salespersonId: dealForm.salespersonId ? parseInt(dealForm.salespersonId) : null,
        expectedClosingDate: dealForm.expectedClosingDate ? new Date(dealForm.expectedClosingDate).toISOString() : null,
        products: dealForm.products.map(p => ({
          name: p.name,
          quantity: parseFloat(p.quantity),
          unitPrice: parseFloat(p.unitPrice),
          discount: parseFloat(p.discount) || 0,
          tax: parseFloat(p.tax) || 0,
        })),
      };

      if (selectedDeal) {
        await API.put(`/deals/${selectedDeal.id}`, payload);
      } else {
        await API.post('/deals', payload);
      }
      setShowAddEditModal(false);
      fetchDeals();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save deal opportunity');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete deal "${name}"?`)) {
      try {
        await API.delete(`/deals/${id}`);
        fetchDeals();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleExport = async () => {
    try {
      const response = await API.get('/export/deals', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'deals-export.csv');
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Deals & Opportunities</h1>
          <p className="text-sm text-slate-500 mt-1">Track pipeline opportunities, estimated closing dates, and probabilities.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition"
          >
            <FileText className="h-4 w-4" /> Export CSV
          </button>
          {user.role !== 'View Only' && (
            <button
              onClick={openAddDealModal}
              className="flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition"
            >
              <Plus className="h-4 w-4" /> Create Deal
            </button>
          )}
        </div>
      </div>

      {/* FILTER SHEET */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs outline-none focus:border-teal-500"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
        >
          <option value="">All Stages</option>
          <option value="New">New</option>
          <option value="Qualification">Qualification</option>
          <option value="Proposal">Proposal</option>
          <option value="Negotiation">Negotiation</option>
          <option value="Won">Won</option>
          <option value="Lost">Lost</option>
        </select>
        <select
          value={salespersonFilter}
          onChange={(e) => setSalespersonFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
        >
          <option value="">All Owners</option>
          {salesTeam.map(sp => (
            <option key={sp.id} value={sp.id}>{sp.name}</option>
          ))}
        </select>
      </div>

      {/* DEALS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-slate-800">
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <FolderKanban className="h-12 w-12 mx-auto mb-4 stroke-1 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">No deals logged</h3>
            <p className="text-xs text-slate-500 mt-1">Create a deal or modify current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <th onClick={() => handleSort('id')} className="py-4 px-6 cursor-pointer hover:bg-slate-100 select-none">
                    Deal ID <ArrowUpDown className="inline h-3 w-3 ml-1" />
                  </th>
                  <th onClick={() => handleSort('name')} className="py-4 px-6 cursor-pointer hover:bg-slate-100 select-none">
                    Opportunity <ArrowUpDown className="inline h-3 w-3 ml-1" />
                  </th>
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6">Deal Value</th>
                  <th className="py-4 px-6">Weighted Value</th>
                  <th className="py-4 px-6">Stage</th>
                  <th className="py-4 px-6">Probability</th>
                  <th className="py-4 px-6">Owner</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Closing Date</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deals.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-6 font-semibold">DL-{String(d.id).padStart(5, '0')}</td>
                    <td className="py-4 px-6 font-bold text-slate-900">{d.name}</td>
                    <td className="py-4 px-6 font-medium text-teal-600 cursor-pointer hover:underline" onClick={() => navigate(`/customers/${d.customerId}`)}>{d.customer.name}</td>
                    <td className="py-4 px-6 font-semibold">₹{d.dealValue.toLocaleString()}</td>
                    <td className="py-4 px-6 font-semibold text-teal-600">₹{(d.weightedValue || 0).toLocaleString()}</td>
                    <td className="py-4 px-6 font-medium">{d.dealStage}</td>
                    <td className="py-4 px-6 font-mono">{d.probability}%</td>
                    <td className="py-4 px-6">{d.salesperson ? d.salesperson.name : 'Unassigned'}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        d.status === 'Won' ? 'bg-emerald-100 text-emerald-700' : d.status === 'Lost' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      {d.expectedClosingDate ? new Date(d.expectedClosingDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center gap-2">
                        {user.role !== 'View Only' && (
                          <>
                            <button
                              onClick={() => openEditDealModal(d)}
                              title="Edit Deal"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(d.id, d.name)}
                              title="Delete Deal"
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

      {/* --- ADD / EDIT DEAL OPPORTUNITY MODAL --- */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">{selectedDeal ? 'Edit Deal Opportunity' : 'Create Sales Opportunity'}</h3>
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
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Deal Title *</label>
                  <input
                    type="text"
                    required
                    value={dealForm.name}
                    onChange={(e) => setDealForm({ ...dealForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Customer Client *</label>
                  <select
                    required
                    value={dealForm.customerId}
                    onChange={(e) => setDealForm({ ...dealForm, customerId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="">Select customer...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Pipeline Stage *</label>
                  <select
                    value={dealForm.dealStage}
                    onChange={(e) => setDealForm({ ...dealForm, dealStage: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="New">New</option>
                    <option value="Qualification">Qualification</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Closing Probability (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={dealForm.probability}
                    onChange={(e) => setDealForm({ ...dealForm, probability: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Expected Closing Date</label>
                  <input
                    type="date"
                    value={dealForm.expectedClosingDate}
                    onChange={(e) => setDealForm({ ...dealForm, expectedClosingDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Status *</label>
                  <select
                    value={dealForm.status}
                    onChange={(e) => setDealForm({ ...dealForm, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="Open">Open</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Assigned Salesperson</label>
                  <select
                    value={dealForm.salespersonId}
                    onChange={(e) => setDealForm({ ...dealForm, salespersonId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="">Select owner...</option>
                    {salesTeam.map(sp => (
                      <option key={sp.id} value={sp.id}>{sp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Opportunity Value (INR) *</label>
                  <input
                    type="number"
                    required
                    readOnly={dealForm.products?.length > 0}
                    value={dealForm.dealValue}
                    onChange={(e) => setDealForm({ ...dealForm, dealValue: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none bg-slate-50 font-bold focus:border-teal-500"
                  />
                </div>
              </div>

              {dealForm.status === 'Lost' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Lost Reason *</label>
                  <select
                    value={dealForm.lostReason}
                    onChange={(e) => setDealForm({ ...dealForm, lostReason: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="">Select reason...</option>
                    <option value="Price too high">Price too high</option>
                    <option value="Competitor won">Competitor won</option>
                    <option value="No budget">No budget</option>
                    <option value="Feature gap">Feature gap</option>
                    <option value="Timeline delay">Timeline delay</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              {/* PRODUCTS SECTION */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Associated Products</h4>
                  <button
                    type="button"
                    onClick={addProductRow}
                    className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700"
                  >
                    <PlusCircle className="h-4 w-4" /> Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {dealForm.products.map((prod, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-3">
                        <select
                          value={prod.sku}
                          onChange={(e) => {
                            const newProds = [...dealForm.products];
                            newProds[idx].sku = e.target.value;
                            setDealForm({ ...dealForm, products: newProds });
                            selectInventoryProduct(idx, e.target.value);
                          }}
                          className="w-full rounded border border-slate-200 py-1 px-2 outline-none bg-white text-[11px]"
                        >
                          <option value="">Select product...</option>
                          {inventoryProducts.map(inv => (
                            <option key={inv.sku} value={inv.sku}>{inv.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          required
                          placeholder="Item description"
                          value={prod.name}
                          onChange={(e) => handleProductChange(idx, 'name', e.target.value)}
                          className="w-full rounded border border-slate-200 py-1 px-2 outline-none text-[11px] bg-white"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Qty"
                          value={prod.quantity}
                          onChange={(e) => handleProductChange(idx, 'quantity', parseFloat(e.target.value))}
                          className="w-full rounded border border-slate-200 py-1 px-1 outline-none text-right text-[11px] bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          required
                          placeholder="Rate"
                          value={prod.unitPrice}
                          onChange={(e) => handleProductChange(idx, 'unitPrice', parseFloat(e.target.value))}
                          className="w-full rounded border border-slate-200 py-1 px-2 outline-none text-right text-[11px] bg-white"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          placeholder="Disc %"
                          value={prod.discount}
                          onChange={(e) => handleProductChange(idx, 'discount', parseFloat(e.target.value))}
                          className="w-full rounded border border-slate-200 py-1 px-1 outline-none text-right text-[11px] bg-white"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          placeholder="Tax %"
                          value={prod.tax}
                          onChange={(e) => handleProductChange(idx, 'tax', parseFloat(e.target.value))}
                          className="w-full rounded border border-slate-200 py-1 px-1 outline-none text-right text-[11px] bg-white"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end gap-2 items-center">
                        <span className="font-semibold font-mono text-[10px] text-slate-800">₹{Math.round(prod.total || 0)}</span>
                        <button
                          type="button"
                          onClick={() => removeProductRow(idx)}
                          className="text-rose-500 hover:text-rose-600 rounded p-1 hover:bg-rose-50"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {dealForm.products.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-xs italic">No items added. The deal value will be editable manually.</div>
                  )}
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
                  Save Deal
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

export default Deals;
