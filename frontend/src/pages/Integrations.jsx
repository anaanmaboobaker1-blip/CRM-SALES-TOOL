import React from 'react';
import {
  GitCompare,
  CheckCircle,
  Layers,
  Receipt,
  TrendingUp,
  Boxes,
  Users,
  CalendarCheck
} from 'lucide-react';

function Integrations() {
  const integrationsList = [
    { name: 'CRM ➔ Invoice Integration', desc: 'Converts confirmed Sales Orders into Invoice ledger items.', icon: Receipt, status: 'Connected', badge: 'bg-emerald-50 text-emerald-700' },
    { name: 'CRM ➔ Payments Adapter', desc: 'Syncs unpaid dues and invoices payment details dynamically.', icon: TrendingUp, status: 'Active', badge: 'bg-emerald-50 text-emerald-700' },
    { name: 'CRM ➔ Accounting Ledger', desc: 'Pulls credit limits and client credit ratings for validation.', icon: Layers, status: 'Active', badge: 'bg-emerald-50 text-emerald-700' },
    { name: 'CRM ➔ Inventory Tracker', desc: 'Pulls product catalogs, rates, and deducts stock on order fulfillment.', icon: Boxes, status: 'Connected', badge: 'bg-emerald-50 text-emerald-700' },
    { name: 'CRM ➔ HR Master Data', desc: 'Synchronizes active salesperson accounts from payroll staff rosters.', icon: Users, status: 'Active', badge: 'bg-emerald-50 text-emerald-700' },
    { name: 'CRM ➔ POS Retail Feed', desc: 'Streams retail purchases and counter transactions into timelines.', icon: CalendarCheck, status: 'Connected', badge: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div className="space-y-6 text-slate-800">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Integrations</h1>
        <p className="text-sm text-slate-500 mt-1">Configure connections and view mock adapters status for auxiliary products.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrationsList.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 hover:shadow-md transition">
              <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 text-sm leading-tight">{item.name}</h4>
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold ${item.badge}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                <div className="flex gap-2 pt-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Adapter: Mock</span>
                  <span>|</span>
                  <span>Port: Local API Feed</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Integrations;
