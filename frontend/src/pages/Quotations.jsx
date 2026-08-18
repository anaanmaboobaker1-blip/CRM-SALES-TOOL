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
  FileDown,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  PlusCircle,
  Trash
} from 'lucide-react';

function Quotations() {
  const { user } = useAuth();
  const location = useLocation();

  // Data states
  const [quotations, setQuotations] = useState([]);
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
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [quoteForm, setQuoteForm] = useState({
    customerId: '',
    contactId: '',
    quotationDate: '',
    validityDate: '',
    paymentTerms: '50% advance, 50% on completion',
    termsAndConditions: '1. Standard 1 year warranty.\n2. Support available Mon-Fri.',
    notes: '',
    salespersonId: '',
    status: 'Draft',
    discountAmount: '0',
    items: [],
  });

  // Calculate live values
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    taxAmount: 0,
    grandTotal: 0,
  });

  const fetchQuotations = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await API.get('/quotations', {
        params: {
          page,
          limit,
          sortBy,
          sortOrder,
          search,
          status: statusFilter,
        },
      });
      setQuotations(response.data.data);
      setTotal(response.data.pagination.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAssociations = async () => {
    try {
      const [custRes, teamRes, invRes] = await Promise.all([
        API.get('/customers', { params: { limit: 100 } }),
        API.get('/sales-team'),
        API.get('/integrations/products'),
      ]);
      setCustomers(custRes.data.data);
      setSalesTeam(teamRes.data.data);
      setInventoryProducts(invRes.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [page, sortBy, sortOrder, statusFilter]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchQuotations();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  useEffect(() => {
    loadAssociations();
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'create') {
      openAddQuoteModal();
    }
  }, [location]);

  // Recalculate invoice totals when items or general discount changes
  useEffect(() => {
    let sub = 0;
    let tax = 0;

    quoteForm.items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.unitPrice) || 0;
      const disc = parseFloat(item.discount) || 0;
      const tPercent = parseFloat(item.tax) || 0;

      const base = qty * rate;
      const itemDisc = base * (disc / 100);
      const afterDisc = base - itemDisc;
      const itemTax = afterDisc * (tPercent / 100);

      sub += afterDisc;
      tax += itemTax;
    });

    const discTotal = parseFloat(quoteForm.discountAmount) || 0;
    const grand = Math.max(0, sub - discTotal + tax);

    setCalculations({
      subtotal: sub,
      taxAmount: tax,
      grandTotal: grand,
    });
  }, [quoteForm.items, quoteForm.discountAmount]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openAddQuoteModal = () => {
    setSelectedQuote(null);
    setQuoteForm({
      customerId: '',
      contactId: '',
      quotationDate: new Date().toISOString().substring(0, 10),
      validityDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      paymentTerms: '50% advance, 50% on completion',
      termsAndConditions: '1. Standard 1 year warranty.\n2. Support available Mon-Fri.',
      notes: '',
      salespersonId: user.role === 'Salesperson' ? user.id : '',
      status: 'Draft',
      discountAmount: '0',
      items: [{ sku: '', name: '', quantity: 1, unitPrice: 0, discount: 0, tax: 18, total: 0 }],
    });
    setErrorMessage(null);
    setShowAddEditModal(true);
  };

  const openEditQuoteModal = (quote) => {
    setSelectedQuote(quote);
    setQuoteForm({
      customerId: quote.customerId,
      contactId: quote.contactId || '',
      quotationDate: new Date(quote.quotationDate).toISOString().substring(0, 10),
      validityDate: quote.validityDate ? new Date(quote.validityDate).toISOString().substring(0, 10) : '',
      paymentTerms: quote.paymentTerms || '',
      termsAndConditions: quote.termsAndConditions || '',
      notes: quote.notes || '',
      salespersonId: quote.salespersonId || '',
      status: quote.status,
      discountAmount: String(quote.discountAmount),
      items: quote.items || [],
    });
    setErrorMessage(null);
    setShowAddEditModal(true);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...quoteForm.items];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    
    const qty = parseFloat(updated[index].quantity) || 0;
    const rate = parseFloat(updated[index].unitPrice) || 0;
    const disc = parseFloat(updated[index].discount) || 0;
    const tax = parseFloat(updated[index].tax) || 0;

    const base = qty * rate;
    const total = base * (1 - disc / 100) * (1 + tax / 100);
    updated[index].total = total;

    setQuoteForm({
      ...quoteForm,
      items: updated,
    });
  };

  const selectInventoryProduct = (index, sku) => {
    const matched = inventoryProducts.find(p => p.sku === sku);
    if (matched) {
      handleItemChange(index, 'name', matched.name);
      handleItemChange(index, 'unitPrice', matched.price);
    }
  };

  const addItemRow = () => {
    setQuoteForm({
      ...quoteForm,
      items: [...quoteForm.items, { sku: '', name: '', quantity: 1, unitPrice: 0, discount: 0, tax: 18, total: 0 }],
    });
  };

  const removeItemRow = (index) => {
    setQuoteForm({
      ...quoteForm,
      items: quoteForm.items.filter((_, idx) => idx !== index),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (quoteForm.items.length === 0) {
      setErrorMessage('At least one line item is required');
      return;
    }

    try {
      const payload = {
        ...quoteForm,
        customerId: parseInt(quoteForm.customerId),
        contactId: quoteForm.contactId ? parseInt(quoteForm.contactId) : null,
        salespersonId: quoteForm.salespersonId ? parseInt(quoteForm.salespersonId) : null,
        discountAmount: parseFloat(quoteForm.discountAmount) || 0,
        items: quoteForm.items.map(item => ({
          name: item.name,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          discount: parseFloat(item.discount) || 0,
          tax: parseFloat(item.tax) || 0,
        })),
      };

      if (selectedQuote) {
        await API.put(`/quotations/${selectedQuote.id}`, payload);
      } else {
        await API.post('/quotations', payload);
      }
      setShowAddEditModal(false);
      fetchQuotations();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save quotation');
    }
  };

  const handleDelete = async (id, num) => {
    if (window.confirm(`Are you sure you want to delete quotation "${num}"?`)) {
      try {
        await API.delete(`/quotations/${id}`);
        fetchQuotations();
      } catch (err) {
        alert(err.response?.data?.message || 'Delete failed');
      }
    }
  };

  const handleConvertToSalesOrder = async (id, num) => {
    if (window.confirm(`Convert quotation "${num}" to Sales Order?`)) {
      try {
        await API.post(`/quotations/${id}/convert`);
        alert('Successfully generated Sales Order! Opening orders module...');
        navigate('/orders');
      } catch (err) {
        alert(err.response?.data?.message || 'Conversion failed. Please ensure the status is Accepted first.');
      }
    }
  };

  const handleUpdateStatus = async (id, currentStatus, nextStatus) => {
    try {
      await API.put(`/quotations/${id}`, { status: nextStatus });
      fetchQuotations();
    } catch (err) {
      alert(err.response?.data?.message || 'Status update failed');
    }
  };

  const statusBadge = {
    Draft: 'bg-slate-100 text-slate-700',
    Sent: 'bg-blue-100 text-blue-700',
    Accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Rejected: 'bg-rose-100 text-rose-700 border-rose-200',
    Expired: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quotations</h1>
          <p className="text-sm text-slate-500 mt-1">Generate pricing quotations, print document PDFs, and convert accepted quotes to orders.</p>
        </div>
        {user.role !== 'View Only' && (
          <button
            onClick={openAddQuoteModal}
            className="flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition"
          >
            <Plus className="h-4 w-4" /> Create Quotation
          </button>
        )}
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative w-80">
          <input
            type="text"
            placeholder="Search quotations..."
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
          <option value="Draft">Draft</option>
          <option value="Sent">Sent</option>
          <option value="Accepted">Accepted</option>
          <option value="Rejected">Rejected</option>
          <option value="Expired">Expired</option>
        </select>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-slate-800">
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
          </div>
        ) : quotations.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 stroke-1 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">No quotations found</h3>
            <p className="text-xs text-slate-500 mt-1">Create a new price quotation for your customer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <th onClick={() => handleSort('quotationNumber')} className="py-4 px-6 cursor-pointer hover:bg-slate-100 select-none">
                    Quotation No <ArrowUpDown className="inline h-3 w-3 ml-1" />
                  </th>
                  <th className="py-4 px-6">Customer</th>
                  <th onClick={() => handleSort('quotationDate')} className="py-4 px-6 cursor-pointer hover:bg-slate-100 select-none">
                    Date <ArrowUpDown className="inline h-3 w-3 ml-1" />
                  </th>
                  <th className="py-4 px-6">Validity Date</th>
                  <th className="py-4 px-6">Subtotal</th>
                  <th className="py-4 px-6">Grand Total</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-6 font-semibold">{q.quotationNumber}</td>
                    <td className="py-4 px-6 font-bold text-slate-900">{q.customer.name}</td>
                    <td className="py-4 px-6">{new Date(q.quotationDate).toLocaleDateString()}</td>
                    <td className="py-4 px-6 text-slate-500">
                      {q.validityDate ? new Date(q.validityDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-4 px-6 font-medium">₹{q.subtotal.toLocaleString()}</td>
                    <td className="py-4 px-6 font-bold text-teal-600">₹{q.grandTotal.toLocaleString()}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadge[q.status]}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center gap-2">
                        {/* Download PDF link */}
                        <a
                          href={`http://localhost:5000/api/quotations/${q.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          title="Download PDF"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <FileDown className="h-4 w-4" />
                        </a>

                        {user.role !== 'View Only' && (
                          <>
                            {q.status === 'Sent' && (
                              <button
                                onClick={() => handleUpdateStatus(q.id, q.status, 'Accepted')}
                                title="Mark Accepted"
                                className="rounded-lg p-1.5 text-emerald-500 hover:bg-emerald-50"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            )}
                            {q.status === 'Accepted' && (
                              <button
                                onClick={() => handleConvertToSalesOrder(q.id, q.quotationNumber)}
                                title="Convert to Sales Order"
                                className="rounded-lg p-1.5 text-teal-500 hover:bg-teal-50"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            )}
                            {(q.status === 'Draft' || q.status === 'Sent') && (
                              <>
                                <button
                                  onClick={() => openEditQuoteModal(q)}
                                  title="Edit"
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(q.id, q.quotationNumber)}
                                  title="Delete"
                                  className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
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

      {/* --- ADD / EDIT QUOTATION FORM MODAL --- */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">{selectedQuote ? 'Edit Quotation' : 'Create Pricing Quotation'}</h3>
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
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Customer Selection *</label>
                  <select
                    required
                    value={quoteForm.customerId}
                    onChange={(e) => setQuoteForm({ ...quoteForm, customerId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="">Select customer...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Quotation Date *</label>
                  <input
                    type="date"
                    required
                    value={quoteForm.quotationDate}
                    onChange={(e) => setQuoteForm({ ...quoteForm, quotationDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Validity Expiry Date</label>
                  <input
                    type="date"
                    value={quoteForm.validityDate}
                    onChange={(e) => setQuoteForm({ ...quoteForm, validityDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Assigned Salesperson</label>
                  <select
                    value={quoteForm.salespersonId}
                    onChange={(e) => setQuoteForm({ ...quoteForm, salespersonId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="">Select owner...</option>
                    {salesTeam.map(sp => (
                      <option key={sp.id} value={sp.id}>{sp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Quotation Status *</label>
                  <select
                    value={quoteForm.status}
                    onChange={(e) => setQuoteForm({ ...quoteForm, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
              </div>

              {/* PRODUCTS LIST EDITOR */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Line Items</h4>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700"
                  >
                    <PlusCircle className="h-4 w-4" /> Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {quoteForm.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-3">
                        <select
                          value={item.sku}
                          onChange={(e) => {
                            const newItems = [...quoteForm.items];
                            newItems[idx].sku = e.target.value;
                            setQuoteForm({ ...quoteForm, items: newItems });
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
                          placeholder="Item details"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          className="w-full rounded border border-slate-200 py-1 px-2 outline-none text-[11px] bg-white"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value))}
                          className="w-full rounded border border-slate-200 py-1 px-1 outline-none text-right text-[11px] bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          required
                          placeholder="Rate"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value))}
                          className="w-full rounded border border-slate-200 py-1 px-2 outline-none text-right text-[11px] bg-white"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          placeholder="Disc %"
                          value={item.discount}
                          onChange={(e) => handleItemChange(idx, 'discount', parseFloat(e.target.value))}
                          className="w-full rounded border border-slate-200 py-1 px-1 outline-none text-right text-[11px] bg-white"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          placeholder="Tax %"
                          value={item.tax}
                          onChange={(e) => handleItemChange(idx, 'tax', parseFloat(e.target.value))}
                          className="w-full rounded border border-slate-200 py-1 px-1 outline-none text-right text-[11px] bg-white"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end gap-2 items-center">
                        <span className="font-semibold font-mono text-[10px] text-slate-800">₹{Math.round(item.total || 0)}</span>
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="text-rose-500 hover:text-rose-600 rounded p-1 hover:bg-rose-50"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TOTALS SUMMARY CALCULATION SECTION */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Payment Terms</label>
                    <input
                      type="text"
                      value={quoteForm.paymentTerms}
                      onChange={(e) => setQuoteForm({ ...quoteForm, paymentTerms: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 py-2 px-3 outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Terms & Conditions</label>
                    <textarea
                      rows="3"
                      value={quoteForm.termsAndConditions}
                      onChange={(e) => setQuoteForm({ ...quoteForm, termsAndConditions: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 py-2 px-3 outline-none focus:border-teal-500"
                    ></textarea>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 flex flex-col justify-center">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-500">Subtotal:</span>
                    <span>₹{calculations.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-semibold">Overall Discount:</span>
                    <input
                      type="number"
                      value={quoteForm.discountAmount}
                      onChange={(e) => setQuoteForm({ ...quoteForm, discountAmount: e.target.value })}
                      className="rounded border border-slate-200 py-1 px-2 text-right w-24 outline-none focus:border-teal-500 bg-white"
                    />
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-500">Tax Amount:</span>
                    <span>₹{calculations.taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-slate-200 pt-2 text-sm text-teal-700">
                    <span>Grand Total:</span>
                    <span>₹{calculations.grandTotal.toLocaleString()}</span>
                  </div>
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
                  Save Quotation
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

export default Quotations;
