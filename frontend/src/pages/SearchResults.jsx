import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../api';
import { Search, ArrowRight, Eye, ClipboardList } from 'lucide-react';

function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const executeSearch = async () => {
      if (!query) return;
      setLoading(true);
      try {
        const response = await API.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(response.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    executeSearch();
  }, [query]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  const navigateToRecord = (type, id) => {
    if (type === 'Lead') navigate(`/leads?id=${id}`);
    if (type === 'Customer' || type === 'Contact') navigate(`/customers/${id}`);
    if (type === 'Deal') navigate(`/deals?id=${id}`);
    if (type === 'Quotation') navigate(`/quotations?id=${id}`);
    if (type === 'Sales Order') navigate(`/orders?id=${id}`);
  };

  const categories = [
    { label: 'Leads', list: results?.leads || [] },
    { label: 'Customers', list: results?.customers || [] },
    { label: 'Contacts', list: results?.contacts || [] },
    { label: 'Deals', list: results?.deals || [] },
    { label: 'Quotations', list: results?.quotations || [] },
    { label: 'Sales Orders', list: results?.salesOrders || [] },
  ];

  const totalHits = categories.reduce((sum, cat) => sum + cat.list.length, 0);

  return (
    <div className="space-y-6 text-slate-800">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Global Search Results</h1>
        <p className="text-sm text-slate-500 mt-1">
          Found {totalHits} matching records for keyword: <strong>"{query}"</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <div key={cat.label} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2 uppercase tracking-wider">{cat.label} ({cat.list.length})</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cat.list.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => navigateToRecord(item.type, item.id)}
                  className="p-3 bg-slate-50 hover:bg-teal-50/40 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer transition"
                >
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{item.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.subtitle}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 hover:text-teal-600" />
                </div>
              ))}
              {cat.list.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">No matching {cat.label.toLowerCase()} found.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SearchResults;
