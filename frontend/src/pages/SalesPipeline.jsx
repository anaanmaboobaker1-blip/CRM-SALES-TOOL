import React, { useState, useEffect } from 'react';
import API from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  ArrowRight,
  TrendingUp,
  Coins,
  Calendar,
  Contact,
  AlertTriangle,
  FolderKanban
} from 'lucide-react';

function SalesPipeline() {
  const { user } = useAuth();
  const [board, setBoard] = useState([]);
  const [salesTeam, setSalesTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [salespersonFilter, setSalespersonFilter] = useState('');
  const [dateMin, setDateMin] = useState('');
  const [dateMax, setDateMax] = useState('');

  const fetchPipeline = async () => {
    setLoading(true);
    try {
      const response = await API.get('/pipeline', {
        params: {
          salespersonId: salespersonFilter,
          dateMin,
          dateMax,
        },
      });
      setBoard(response.data.data);
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
    fetchPipeline();
  }, [salespersonFilter, dateMin, dateMax]);

  useEffect(() => {
    fetchSalesTeam();
  }, []);

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e, dealId) => {
    e.dataTransfer.setData('text/plain', dealId.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStageName) => {
    e.preventDefault();
    const dealIdStr = e.dataTransfer.getData('text/plain');
    if (!dealIdStr) return;
    const dealId = parseInt(dealIdStr);

    // Optimistic UI update
    let sourceStageName = '';
    const updatedBoard = board.map(col => {
      const found = col.deals.find(d => d.id === dealId);
      if (found) {
        sourceStageName = col.stageName;
        // remove from this column
        return {
          ...col,
          deals: col.deals.filter(d => d.id !== dealId),
          count: col.count - 1,
          totalValue: col.totalValue - found.dealValue,
        };
      }
      return col;
    });

    if (sourceStageName === targetStageName) return; // dropped in same column

    // Find the item to move
    let movedDeal = null;
    board.forEach(col => {
      const found = col.deals.find(d => d.id === dealId);
      if (found) {
        movedDeal = { ...found, dealStage: targetStageName };
        if (targetStageName === 'Won') {
          movedDeal.status = 'Won';
          movedDeal.probability = 100;
        } else if (targetStageName === 'Lost') {
          movedDeal.status = 'Lost';
          movedDeal.probability = 0;
        } else {
          movedDeal.status = 'Open';
        }
      }
    });

    if (!movedDeal) return;

    // Add to target column
    const finalBoard = updatedBoard.map(col => {
      if (col.stageName === targetStageName) {
        return {
          ...col,
          deals: [movedDeal, ...col.deals],
          count: col.count + 1,
          totalValue: col.totalValue + movedDeal.dealValue,
        };
      }
      return col;
    });

    setBoard(finalBoard);

    try {
      // Trigger API update
      await API.patch(`/pipeline/deals/${dealId}/stage`, { stage: targetStageName });
    } catch (err) {
      console.error(err);
      // rollback on failure
      fetchPipeline();
    }
  };

  const columnColors = {
    'New': 'border-t-slate-400 bg-slate-50',
    'Qualification': 'border-t-sky-400 bg-sky-50/20',
    'Proposal': 'border-t-indigo-400 bg-indigo-50/20',
    'Negotiation': 'border-t-amber-400 bg-amber-50/20',
    'Won': 'border-t-emerald-500 bg-emerald-50/20',
    'Lost': 'border-t-rose-400 bg-rose-50/20',
  };

  const cardStatusBorder = {
    'Won': 'border-l-emerald-500',
    'Lost': 'border-l-rose-400',
    'Open': 'border-l-teal-500',
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sales Pipeline</h1>
          <p className="text-sm text-slate-500 mt-1">Visualize deal progression across sales lifecycle stages. Drag and drop to update.</p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <select
          value={salespersonFilter}
          onChange={(e) => setSalespersonFilter(e.target.value)}
          className="rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
        >
          <option value="">All Salespeople</option>
          {salesTeam.map(sp => (
            <option key={sp.id} value={sp.id}>{sp.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            placeholder="Min Close"
            value={dateMin}
            onChange={(e) => setDateMin(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            placeholder="Max Close"
            value={dateMax}
            onChange={(e) => setDateMax(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6 select-none min-h-[60vh] items-stretch">
          {board.map((col) => (
            <div
              key={col.stageId}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.stageName)}
              className={`flex-shrink-0 w-80 rounded-2xl border-t-4 border border-slate-200 p-4 flex flex-col justify-between ${
                columnColors[col.stageName] || 'border-t-slate-400 bg-slate-50'
              }`}
            >
              <div>
                {/* Column header */}
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{col.stageName}</h3>
                    <span className="text-[10px] text-slate-400 font-medium">Deals: {col.count}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 bg-white border px-2 py-0.5 rounded-lg shadow-sm">
                    ₹{col.totalValue.toLocaleString()}
                  </span>
                </div>

                {/* Card list */}
                <div className="space-y-3 min-h-[30vh] overflow-y-auto max-h-[50vh] pr-1">
                  {col.deals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable={user.role !== 'View Only'}
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      className={`bg-white p-4 rounded-xl border-l-4 border border-slate-100 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition duration-200 ${
                        cardStatusBorder[deal.status] || 'border-l-slate-200'
                      }`}
                    >
                      <h4 className="font-bold text-slate-900 text-xs truncate leading-snug">{deal.name}</h4>
                      <p className="text-[10px] text-teal-600 font-semibold mt-1 truncate">{deal.customer.name}</p>
                      
                      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-50">
                        <span className="font-bold text-xs text-slate-800">₹{deal.dealValue.toLocaleString()}</span>
                        <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-full font-mono">
                          {deal.probability}%
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2.5 text-[9px] text-slate-400">
                        <Contact className="h-3 w-3" />
                        <span className="truncate">{deal.salesperson?.name || 'Unassigned'}</span>
                      </div>

                      {deal.expectedClosingDate && (
                        <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-400">
                          <Calendar className="h-3 w-3" />
                          <span>Close: {new Date(deal.expectedClosingDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {col.deals.length === 0 && (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200/50 rounded-xl text-[11px] text-slate-400 italic">
                      Drag deals here
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SalesPipeline;
