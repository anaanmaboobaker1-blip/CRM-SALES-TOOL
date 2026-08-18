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
  ShoppingCart,
  PlusCircle,
  Trash,
  XCircle,
  FileText
} from 'lucide-react';

function SalesOrders() {
  const { user } = useAuth();
  const location = useLocation();

  // Data states
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
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
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [orderForm, setOrderForm] = useState({
    customerId: '',
    contactId: '',
    orderDate: '',
    deliveryDate: '',
    deliveryAddress: '',
    paymentTerms: '50% advance, 50% on completion',
    notes: '',
    status: 'Pending',
    discountAmount: '0',
    items: [],
  });

  // Calculate live values
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    taxAmount: 0,
    grandTotal: 0,
  });

  const fetchOrders = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await API.get('/sales-orders', {
        params: {
          page,
          limit,
          sortBy,
          sortOrder,
          search,
          status: statusFilter,
        },
      });
      setOrders(response.data.data);
      setTotal(response.data.pagination.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAssociations = async () => {
    try {
      const [custRes, invRes] = await Promise.all([
        API.get('/customers', { params: { limit: 100 } }),
        API.get('/integrations/products'),
      ]);
      setCustomers(custRes.data.data);
      setInventoryProducts(invRes.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, sortBy, sortOrder, statusFilter]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchOrders();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  useEffect(() => {
    loadAssociations();
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'create') {
      openAddOrderModal();
    }
  }, [location]);

  // Recalculate totals
  useEffect(() => {
    let sub = 0;
    let tax = 0;

    orderForm.items.forEach(item => {
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

    const discTotal = parseFloat(orderForm.discountAmount) || 0;
    const grand = Math.max(0, sub - discTotal + tax);

    setCalculations({
      subtotal: sub,
      taxAmount: tax,
      grandTotal: grand,
    });
  }, [orderForm.items, orderForm.discountAmount]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openAddOrderModal = () => {
    setSelectedOrder(null);
    setOrderForm({
      customerId: '',
      contactId: '',
      orderDate: new Date().toISOString().substring(0, 10),
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      deliveryAddress: '',
      paymentTerms: '50% advance, 50% on completion',
      notes: '',
      status: 'Pending',
      discountAmount: '0',
      items: [{ sku: '', name: '', quantity: 1, unitPrice: 0, discount: 0, tax: 18, total: 0 }],
    });
    setErrorMessage(null);
    setShowAddEditModal(true);
  };

  const openEditOrderModal = (order) => {
    setSelectedOrder(order);
    setOrderForm({
      customerId: order.customerId,
      contactId: order.contactId || '',
      orderDate: new Date(order.orderDate).toISOString().substring(0, 10),
      deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toISOString().substring(0, 10) : '',
      deliveryAddress: order.deliveryAddress || '',
      paymentTerms: order.paymentTerms || '',
      notes: order.notes || '',
      status: order.status,
      discountAmount: String(order.discountAmount),
      items: order.items || [],
    });
    setErrorMessage(null);
    setShowAddEditModal(true);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...orderForm.items];
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

    setOrderForm({
      ...orderForm,
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
    setOrderForm({
      ...orderForm,
      items: [...orderForm.items, { sku: '', name: '', quantity: 1, unitPrice: 0, discount: 0, tax: 18, total: 0 }],
    });
  };

  const removeItemRow = (index) => {
    setOrderForm({
      ...orderForm,
      items: orderForm.items.filter((_, idx) => idx !== index),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (orderForm.items.length === 0) {
      setErrorMessage('At least one item is required');
      return;
    }

    try {
      const payload = {
        ...orderForm,
        customerId: parseInt(orderForm.customerId),
        contactId: orderForm.contactId ? parseInt(orderForm.contactId) : null,
        discountAmount: parseFloat(orderForm.discountAmount) || 0,
        items: orderForm.items.map(item => ({
          name: item.name,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          discount: parseFloat(item.discount) || 0,
          tax: parseFloat(item.tax) || 0,
        })),
      };

      if (selectedOrder) {
        await API.put(`/sales-orders/${selectedOrder.id}`, payload);
      } else {
        await API.post('/sales-orders', payload);
      }
      setShowAddEditModal(false);
      fetchOrders();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save sales order');
    }
  };

  const handleDelete = async (id, num) => {
    if (window.confirm(`Are you sure you want to delete order "${num}"?`)) {
      try {
        await API.delete(`/sales-orders/${id}`);
        fetchOrders();
      } catch (err) {
        alert(err.response?.data?.message || 'Delete failed');
      }
    }
  };

  // Integration 1: Inventory stock updates
  const handleFulfillOrder = async (id, num) => {
    if (window.confirm(`Mark order "${num}" as fulfilled and update stock in Inventory module?`)) {
      try {
        await API.patch(`/sales-orders/${id}/status`, { status: 'Fulfilled' });
        alert('Order fulfilled! Stock levels synchronized with Inventory module successfully.');
        fetchOrders();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Integration 2: Invoice posting to accounts ledger
  const handleSyncInvoice = async (id, num) => {
    try {
      const res = await API.post('/integrations/invoice', { docType: 'SALES_ORDER', docId: id });
      alert(`Synchronized successfully!\nGenerated external invoice: ${res.data.data.invoiceNumber}\nPosted to Accounting ledger as POSTED.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelOrder = async (id, num) => {
    if (window.confirm(`Are you sure you want to cancel order "${num}"?`)) {
      try {
        await API.patch(`/sales-orders/${id}/status`, { status: 'Cancelled' });
        fetchOrders();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const statusBadge = {
    Pending: 'bg-slate-100 text-slate-700',
    Confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
    Fulfilled: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sales Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Manage customer orders, print printable documents, and fulfill inventory integration steps.</p>
        </div>
        {user.role !== 'View Only' && (
          <button
            onClick={openAddOrderModal}
            className="flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition"
          >
            <Plus className="h-4 w-4" /> Create Sales Order
          </button>
        )}
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative w-80">
          <input
            type="text"
            placeholder="Search orders..."
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
          <option value="Confirmed">Confirmed</option>
          <option value="Fulfilled">Fulfilled</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-slate-800">
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 stroke-1 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">No orders logged</h3>
            <p className="text-xs text-slate-500 mt-1">Convert a quotation or click create to log a sales order.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <th onClick={() => handleSort('salesOrderNumber')} className="py-4 px-6 cursor-pointer hover:bg-slate-100 select-none">
                    Order No <ArrowUpDown className="inline h-3 w-3 ml-1" />
                  </th>
                  <th className="py-4 px-6">Customer</th>
                  <th onClick={() => handleSort('orderDate')} className="py-4 px-6 cursor-pointer hover:bg-slate-100 select-none">
                    Order Date <ArrowUpDown className="inline h-3 w-3 ml-1" />
                  </th>
                  <th className="py-4 px-6">Delivery Date</th>
                  <th className="py-4 px-6">Grand Total</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Sync Ledger</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-6 font-semibold">{o.salesOrderNumber}</td>
                    <td className="py-4 px-6 font-bold text-slate-900">{o.customer.name}</td>
                    <td className="py-4 px-6">{new Date(o.orderDate).toLocaleDateString()}</td>
                    <td className="py-4 px-6 text-slate-500">
                      {o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-4 px-6 font-bold text-teal-600">₹{o.grandTotal.toLocaleString()}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadge[o.status]}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {o.status !== 'Cancelled' && (
                        <button
                          onClick={() => handleSyncInvoice(o.id, o.salesOrderNumber)}
                          className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 font-bold px-2.5 py-1 rounded"
                        >
                          Invoice Ledg
                        </button>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center gap-2">
                        {/* PDF link */}
                        <a
                          href={`http://localhost:5000/api/sales-orders/${o.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          title="Download PDF"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <FileDown className="h-4 w-4" />
                        </a>

                        {user.role !== 'View Only' && (
                          <>
                            {o.status === 'Pending' && (
                              <button
                                onClick={() => handleFulfillOrder(o.id, o.salesOrderNumber)}
                                title="Fulfill / Deduct Stock"
                                className="rounded-lg p-1.5 text-emerald-500 hover:bg-emerald-50"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            )}
                            {o.status === 'Pending' && (
                              <>
                                <button
                                  onClick={() => openEditOrderModal(o)}
                                  title="Edit Order"
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleCancelOrder(o.id, o.salesOrderNumber)}
                                  title="Cancel Order"
                                  className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                                >
                                  <XCircle className="h-4 w-4" />
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

      {/* --- ADD / EDIT SALES ORDER FORM MODAL --- */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">{selectedOrder ? 'Edit Sales Order' : 'Create Sales Order'}</h3>
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
                    value={orderForm.customerId}
                    onChange={(e) => setOrderForm({ ...orderForm, customerId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="">Select customer...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Order Date *</label>
                  <input
                    type="date"
                    required
                    value={orderForm.orderDate}
                    onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Delivery Target Date</label>
                  <input
                    type="date"
                    value={orderForm.deliveryDate}
                    onChange={(e) => setOrderForm({ ...orderForm, deliveryDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Delivery Address</label>
                  <input
                    type="text"
                    placeholder="Same as shipping address"
                    value={orderForm.deliveryAddress}
                    onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Order Status *</label>
                  <select
                    value={orderForm.status}
                    onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Fulfilled">Fulfilled</option>
                    <option value="Cancelled">Cancelled</option>
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
                  {orderForm.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-3">
                        <select
                          value={item.sku}
                          onChange={(e) => {
                            const newItems = [...orderForm.items];
                            newItems[idx].sku = e.target.value;
                            setOrderForm({ ...orderForm, items: newItems });
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
                      value={orderForm.paymentTerms}
                      onChange={(e) => setOrderForm({ ...orderForm, paymentTerms: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 py-2 px-3 outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Internal Notes</label>
                    <textarea
                      rows="3"
                      value={orderForm.notes}
                      onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
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
                      value={orderForm.discountAmount}
                      onChange={(e) => setOrderForm({ ...orderForm, discountAmount: e.target.value })}
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
                  Save Sales Order
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

export default SalesOrders;
