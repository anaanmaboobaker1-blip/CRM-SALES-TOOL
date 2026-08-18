import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  ClipboardList,
  Upload,
  UserPlus,
  Coins,
  History,
  FileSpreadsheet,
  ShoppingCart,
  FolderKanban,
  FileCheck2,
  CalendarDays,
  Plus,
  BadgeInfo
} from 'lucide-react';

function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core profile state
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Tab related states
  const [timeline, setTimeline] = useState([]);
  const [accounting, setAccounting] = useState(null);
  const [posHistory, setPOSHistory] = useState([]);
  
  // Note creation
  const [newNote, setNewNote] = useState('');
  
  // Contact creation
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    designation: '',
    phone: '',
    email: '',
    isPrimary: false,
    notes: '',
  });

  // Document upload
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  const fetchCustomerProfile = async () => {
    setLoading(true);
    try {
      const response = await API.get(`/customers/${id}`);
      setCustomer(response.data.data);
    } catch (e) {
      console.error(e);
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const response = await API.get(`/customers/${id}/timeline`);
      setTimeline(response.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAccountingInfo = async () => {
    try {
      const response = await API.get(`/integrations/customers/${id}/accounting`);
      setAccounting(response.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPOSHistoryInfo = async () => {
    try {
      const response = await API.get(`/integrations/customers/${id}/pos`);
      setPOSHistory(response.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCustomerProfile();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'timeline') fetchTimeline();
    if (activeTab === 'overview' || activeTab === 'billing') fetchAccountingInfo();
    if (activeTab === 'pos') fetchPOSHistoryInfo();
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  // Action: Add note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await API.post(`/customers/${id}/notes`, { note: newNote });
      setNewNote('');
      fetchCustomerProfile();
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Add contact
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post(`/customers/${id}/contacts`, contactForm);
      setShowContactModal(false);
      setContactForm({ name: '', designation: '', phone: '', email: '', isPrimary: false, notes: '' });
      fetchCustomerProfile();
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Upload file
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('document', uploadFile);
      formData.append('name', uploadName || uploadFile.name);
      
      await API.post(`/customers/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setUploadFile(null);
      setUploadName('');
      fetchCustomerProfile();
    } catch (e) {
      console.error(e);
    } finally {
      setUploadLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building },
    { id: 'contacts', label: 'Contacts', icon: UserPlus },
    { id: 'deals', label: 'Deals', icon: FolderKanban },
    { id: 'quotations', label: 'Quotations', icon: FileSpreadsheet },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'billing', label: 'Billing & Accounting', icon: Coins },
    { id: 'pos', label: 'POS Receipts', icon: History },
    { id: 'notes', label: 'Internal Notes', icon: ClipboardList },
    { id: 'documents', label: 'Documents', icon: Upload },
    { id: 'timeline', label: 'Timeline History', icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-teal-500 font-bold text-lg flex items-center justify-center shadow-lg shadow-teal-500/20">
            {customer.name?.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{customer.name}</h1>
              <span className="text-[10px] bg-slate-850 border border-slate-700 font-bold px-2 py-0.5 rounded-full text-slate-400">
                {customer.customerType}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1">{customer.companyName || 'No corporate account'}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="bg-slate-850 px-4 py-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-medium">Assigned Owner</span>
            <span className="font-bold text-white mt-0.5 block">{customer.assignedSalesperson?.name || 'Unassigned'}</span>
          </div>
          {accounting && (
            <div className="bg-slate-850 px-4 py-2 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block font-medium">Outstanding Balance</span>
              <span className="font-bold text-rose-400 mt-0.5 block">₹{accounting.outstandingBalance.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* TABS SELECT SHEET */}
      <div className="border-b border-slate-200 overflow-x-auto flex gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-semibold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENTS PANEL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-slate-800 min-h-[40vh]">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Client Details</h3>
              <div className="grid grid-cols-3 gap-2 py-1">
                <span className="text-slate-400 font-semibold uppercase tracking-wider">Customer Group</span>
                <span className="col-span-2 text-slate-900 font-medium">{customer.customerGroup || 'General'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1">
                <span className="text-slate-400 font-semibold uppercase tracking-wider">GSTIN Number</span>
                <span className="col-span-2 text-slate-900 font-mono font-medium">{customer.gstin || '—'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1">
                <span className="text-slate-400 font-semibold uppercase tracking-wider">Status</span>
                <span className="col-span-2"><span className="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 rounded font-bold">{customer.status}</span></span>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Contact Directory</h3>
              <div className="flex items-center gap-3 py-1">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="text-slate-900 font-medium">{customer.phone || 'No phone recorded'}</span>
              </div>
              <div className="flex items-center gap-3 py-1">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="text-slate-900 font-medium">{customer.email || 'No email recorded'}</span>
              </div>
              <div className="flex items-start gap-3 py-1">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                <div className="text-slate-900 font-medium">
                  <p><strong>Billing:</strong> {customer.billingAddress || 'N/A'}</p>
                  <p className="mt-1"><strong>Shipping:</strong> {customer.shippingAddress || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTACTS TAB */}
        {activeTab === 'contacts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">Company Contacts</h3>
              {user.role !== 'View Only' && (
                <button
                  onClick={() => setShowContactModal(true)}
                  className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl px-3 py-1.5 text-xs font-semibold transition"
                >
                  <Plus className="h-4 w-4" /> Add Contact
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.contacts?.map((contact) => (
                <div key={contact.id} className="border border-slate-100 p-4 rounded-xl shadow-sm bg-slate-50/50 flex flex-col justify-between text-xs">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-950 text-sm">{contact.name}</span>
                      {contact.isPrimary && (
                        <span className="bg-teal-50 text-teal-600 text-[9px] font-bold px-2 py-0.5 rounded border border-teal-100">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 font-medium mt-0.5">{contact.designation || 'Contact Person'}</p>
                    <div className="mt-3 space-y-1.5 text-slate-700">
                      {contact.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-slate-400" /> {contact.phone}</div>}
                      {contact.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-slate-400" /> {contact.email}</div>}
                    </div>
                  </div>
                  {contact.notes && (
                    <p className="mt-3 border-t pt-2 text-[10px] text-slate-500 italic">{contact.notes}</p>
                  )}
                </div>
              ))}
              {(!customer.contacts || customer.contacts.length === 0) && (
                <div className="text-center py-8 text-slate-400 col-span-2 text-xs">No contacts added yet.</div>
              )}
            </div>
          </div>
        )}

        {/* DEALS TAB */}
        {activeTab === 'deals' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Ongoing Deals</h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <th className="py-2.5 px-4">Deal Name</th>
                  <th className="py-2.5 px-4">Value</th>
                  <th className="py-2.5 px-4">Stage</th>
                  <th className="py-2.5 px-4">Probability</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Closing Date</th>
                </tr>
              </thead>
              <tbody>
                {customer.deals?.map(deal => (
                  <tr key={deal.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-teal-600 hover:underline cursor-pointer" onClick={() => navigate(`/deals?id=${deal.id}`)}>
                      {deal.name}
                    </td>
                    <td className="py-3 px-4 font-semibold">₹{deal.dealValue.toLocaleString()}</td>
                    <td className="py-3 px-4 font-medium">{deal.dealStage}</td>
                    <td className="py-3 px-4">{deal.probability}%</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        deal.status === 'Won' ? 'bg-emerald-50 text-emerald-600' : deal.status === 'Lost' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-600'
                      }`}>{deal.status}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {deal.expectedClosingDate ? new Date(deal.expectedClosingDate).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
                {(!customer.deals || customer.deals.length === 0) && (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-400">No opportunities logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* QUOTATIONS TAB */}
        {activeTab === 'quotations' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Generated Quotations</h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <th className="py-2.5 px-4">Quote Number</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Total Amount</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customer.quotations?.map(quote => (
                  <tr key={quote.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold">{quote.quotationNumber}</td>
                    <td className="py-3 px-4">{new Date(quote.quotationDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-semibold">₹{quote.grandTotal.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        quote.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600' : quote.status === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-600'
                      }`}>{quote.status}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <a
                        href={`http://localhost:5000/api/quotations/${quote.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-600 hover:underline font-bold"
                      >
                        Download PDF
                      </a>
                    </td>
                  </tr>
                ))}
                {(!customer.quotations || customer.quotations.length === 0) && (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-400">No quotation logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Sales Orders</h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <th className="py-2.5 px-4">Order Number</th>
                  <th className="py-2.5 px-4">Order Date</th>
                  <th className="py-2.5 px-4">Delivery Date</th>
                  <th className="py-2.5 px-4">Grand Total</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customer.salesOrders?.map(order => (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold">{order.salesOrderNumber}</td>
                    <td className="py-3 px-4">{new Date(order.orderDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4">{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : '—'}</td>
                    <td className="py-3 px-4 font-semibold">₹{order.grandTotal.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        order.status === 'Confirmed' ? 'bg-teal-50 text-teal-600' : order.status === 'Fulfilled' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'
                      }`}>{order.status}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <a
                        href={`http://localhost:5000/api/sales-orders/${order.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-600 hover:underline font-bold"
                      >
                        Download PDF
                      </a>
                    </td>
                  </tr>
                ))}
                {(!customer.salesOrders || customer.salesOrders.length === 0) && (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-400">No orders logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* BILLING & INTEGRATIONS */}
        {activeTab === 'billing' && (
          <div className="space-y-6 text-xs text-slate-800">
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="flex gap-4 items-center">
                <Coins className="h-8 w-8 text-teal-600" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Credit Status Indicator</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Real-time balances fetched from Accounting Adapter</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Credit Limit</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">₹{accounting?.creditLimit.toLocaleString() || '0'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Outstanding Dues</span>
                  <span className="text-sm font-bold text-rose-500 mt-1 block">₹{accounting?.outstandingBalance.toLocaleString() || '0'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Ledger Status</span>
                  <span className="text-xs font-bold text-emerald-600 mt-1 block">{accounting?.status || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="bg-teal-50 border border-teal-100 p-4 rounded-2xl flex gap-3 text-teal-800">
              <BadgeInfo className="h-5 w-5 text-teal-600 flex-shrink-0" />
              <p className="text-[11px] leading-relaxed">
                <strong>Accounting Integration Connected</strong>: Invoice details and payment reminders are automatically synchronized between the SME CRM and the backend accounts module. Outstanding limits are checked dynamically prior to generating new Quotations.
              </p>
            </div>
          </div>
        )}

        {/* POS HISTORY */}
        {activeTab === 'pos' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">POS Retail Purchases</h3>
            <p className="text-xs text-slate-400">Offline counter receipts integrated via POS adaptors</p>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <th className="py-2.5 px-4">Receipt No</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Store Location</th>
                  <th className="py-2.5 px-4">Items Purchased</th>
                  <th className="py-2.5 px-4 text-right">Paid Amount</th>
                </tr>
              </thead>
              <tbody>
                {posHistory.map(pos => (
                  <tr key={pos.receiptNo} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-semibold">{pos.receiptNo}</td>
                    <td className="py-3 px-4">{pos.date}</td>
                    <td className="py-3 px-4">{pos.store}</td>
                    <td className="py-3 px-4 text-slate-600">{pos.items}</td>
                    <td className="py-3 px-4 text-right font-bold">₹{pos.amount.toLocaleString()}</td>
                  </tr>
                ))}
                {posHistory.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-400">No POS transactions logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800">Customer Files Log</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {customer.notes?.map(n => (
                <div key={n.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-slate-600">{n.user?.name}</span>
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{n.note}</p>
                </div>
              ))}
              {(!customer.notes || customer.notes.length === 0) && (
                <div className="text-center py-8 text-slate-400 text-xs">No notes logged.</div>
              )}
            </div>

            {user.role !== 'View Only' && (
              <form onSubmit={handleAddNote} className="border-t pt-4 flex gap-3">
                <input
                  type="text"
                  placeholder="Log custom timeline note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 px-4 text-xs outline-none focus:border-teal-500"
                />
                <button
                  type="submit"
                  className="bg-teal-500 hover:bg-teal-600 px-6 py-2.5 rounded-xl text-xs font-semibold text-white transition"
                >
                  Log Note
                </button>
              </form>
            )}
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="space-y-6 text-xs text-slate-800">
            <h3 className="text-sm font-bold text-slate-800">Uploaded Contracts & KYC Documents</h3>
            
            {user.role !== 'View Only' && (
              <form onSubmit={handleUploadSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col sm:flex-row gap-4 items-end">
                <div className="w-full sm:w-1/2">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Document Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Signed Service Agreement"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-1.5 px-3 bg-white outline-none text-xs focus:border-teal-500"
                  />
                </div>
                <div className="w-full sm:w-1/3">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">File Attachment *</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="w-full text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={uploadLoading || !uploadFile}
                  className="bg-teal-500 hover:bg-teal-600 disabled:bg-slate-200 text-white rounded-lg px-4 py-2 font-semibold transition"
                >
                  {uploadLoading ? 'Uploading...' : 'Upload'}
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {customer.documents?.map(doc => (
                <div key={doc.id} className="border border-slate-100 p-4 rounded-xl shadow-sm flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 leading-tight">{doc.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Uploaded by: {doc.uploadedBy.name}</p>
                    <span className="text-[9px] bg-slate-100 font-semibold px-2 py-0.5 rounded text-slate-500 mt-2 inline-block uppercase tracking-wider">{doc.fileType?.split('/')[1] || 'PDF'}</span>
                  </div>
                  <a
                    href={`http://localhost:5000/${doc.filePath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-600 hover:underline font-bold text-[10px]"
                  >
                    View File
                  </a>
                </div>
              ))}
              {(!customer.documents || customer.documents.length === 0) && (
                <div className="text-center py-8 text-slate-400 col-span-3 text-xs">No documents uploaded.</div>
              )}
            </div>
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800">Timeline Interactions</h3>
            <div className="relative border-l-2 border-slate-100 ml-4 space-y-6 text-xs">
              {timeline.map((event) => (
                <div key={event.id} className="relative pl-6">
                  {/* Event Indicator dot */}
                  <span className="absolute -left-1.5 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-teal-500 shadow shadow-teal-500/20"></span>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">{event.type}</span>
                    <span>{new Date(event.date).toLocaleString()}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 mt-1">{event.title}</h4>
                  <p className="text-slate-500 mt-0.5 leading-relaxed">{event.description}</p>
                  <p className="text-[9px] text-slate-400 mt-1 italic">Logged by: {event.user}</p>
                </div>
              ))}
              {timeline.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs">No client events logged.</div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ADD CONTACT MODAL */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-slate-800">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Add Customer Contact</h3>
            <form onSubmit={handleContactSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Purchasing Manager"
                  value={contactForm.designation}
                  onChange={(e) => setContactForm({ ...contactForm, designation: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Phone</label>
                  <input
                    type="tel"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={contactForm.isPrimary}
                  onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs font-semibold text-slate-700">Set as Primary contact</span>
              </label>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Internal Notes</label>
                <textarea
                  rows="3"
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-500 hover:bg-teal-600 px-6 py-2 text-xs font-semibold text-white"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerProfile;
