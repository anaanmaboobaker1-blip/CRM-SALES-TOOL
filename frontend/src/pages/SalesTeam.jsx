import React, { useState, useEffect } from 'react';
import API from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Contact,
  Target,
  Trophy,
  UserPlus,
  Coins,
  TrendingUp,
  AlertTriangle,
  Plus
} from 'lucide-react';

function SalesTeam() {
  const { user, isAdmin, isManager } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Set Target Modal
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [targetForm, setTargetForm] = useState({
    salespersonId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    targetAmount: '',
  });

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const response = await API.get('/sales-team');
      setTeam(response.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const openTargetModal = (member) => {
    setSelectedMember(member);
    setTargetForm({
      salespersonId: member.id,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      targetAmount: member.monthlyTarget || '',
    });
    setShowTargetModal(true);
  };

  const handleTargetSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/sales-team/targets', {
        ...targetForm,
        salespersonId: parseInt(targetForm.salespersonId),
        month: parseInt(targetForm.month),
        year: parseInt(targetForm.year),
        targetAmount: parseFloat(targetForm.targetAmount),
      });
      setShowTargetModal(false);
      fetchTeam();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sales Team</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor target achievements, leads distribution, and close rates across your team.</p>
        </div>
      </div>

      {/* SALES TEAM GRID */}
      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-slate-800">
          {team.map((member) => (
            <div key={member.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <div className="h-10 w-10 rounded-xl bg-teal-50 font-bold text-teal-600 flex items-center justify-center">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{member.name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">{member.team} Team</p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-slate-100 font-semibold px-2 py-0.5 rounded text-slate-500">
                    Salesperson
                  </span>
                </div>

                {/* Metrics Summary */}
                <div className="grid grid-cols-2 gap-4 mt-6 text-xs border-y py-3 border-slate-100">
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[9px] block">Leads Assigned</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{member.leadsAssigned}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[9px] block">Deals Won</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{member.dealsWon}</span>
                  </div>
                </div>

                {/* Target progress */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-500">Target Progress:</span>
                    <span>{Math.round(member.achievementPercentage)}%</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, member.achievementPercentage)}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold pt-1">
                    <span>Achieved: ₹{member.salesAchieved.toLocaleString()}</span>
                    <span>Goal: ₹{member.monthlyTarget.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Set target button for manager/admin */}
              {(isAdmin || isManager) && (
                <button
                  onClick={() => openTargetModal(member)}
                  className="w-full py-2 bg-slate-50 border hover:bg-slate-100 font-bold rounded-xl text-xs text-slate-700 transition"
                >
                  Configure Target
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* --- SET TARGET MODAL --- */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-slate-800">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Set Target - {selectedMember?.name}</h3>
            
            <form onSubmit={handleTargetSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Target Month *</label>
                  <select
                    value={targetForm.month}
                    onChange={(e) => setTargetForm({ ...targetForm, month: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500 bg-white"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString('en', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Target Year *</label>
                  <input
                    type="number"
                    required
                    value={targetForm.year}
                    onChange={(e) => setTargetForm({ ...targetForm, year: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Monthly Target Amount (INR) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 500000"
                  value={targetForm.targetAmount}
                  onChange={(e) => setTargetForm({ ...targetForm, targetAmount: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-500 hover:bg-teal-600 px-6 py-2 text-xs font-semibold text-white"
                >
                  Configure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesTeam;
