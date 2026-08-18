import React from 'react';
import { Settings as SettingsIcon, CheckCircle2, ShieldCheck, Database, Sliders } from 'lucide-react';

function Settings() {
  return (
    <div className="space-y-6 text-slate-800">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure general system behaviors, default parameters, and security roles.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm max-w-2xl space-y-6">
        <div className="flex gap-4 items-center border-b pb-4">
          <SettingsIcon className="h-8 w-8 text-teal-600" />
          <div>
            <h4 className="font-bold text-slate-900 text-sm">System Properties</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Parameters governing calculations and notifications</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-teal-600 flex-shrink-0" />
            <div>
              <h5 className="font-bold text-slate-900">Security & RBAC Enforcement</h5>
              <p className="text-slate-500 mt-0.5">Role permissions are locked server-side. Session authorization expires after 24 hours.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-teal-600 flex-shrink-0" />
            <div>
              <h5 className="font-bold text-slate-900">Database Engine</h5>
              <p className="text-slate-500 mt-0.5">Configured via Prisma Client. Active engine: <strong>SQLite (Local dev.db)</strong>.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Sliders className="h-5 w-5 text-teal-600 flex-shrink-0" />
            <div>
              <h5 className="font-bold text-slate-900">System Numbering Formulas</h5>
              <p className="text-slate-500 mt-0.5">Quotations: YYYY sequential numbering. Default tax rate: 18% GST.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
