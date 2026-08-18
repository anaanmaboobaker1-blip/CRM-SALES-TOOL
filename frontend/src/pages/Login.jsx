import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loadingState, setLoadingState] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoadingState(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoadingState(false);
    }
  };

  const handleFillCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  const demoUsers = [
    { label: 'Admin', email: 'admin@sme.com', pass: 'admin123' },
    { label: 'Manager', email: 'manager@sme.com', pass: 'manager123' },
    { label: 'Salesperson', email: 'sales1@sme.com', pass: 'sales123' },
    { label: 'View Only', email: 'view@sme.com', pass: 'view123' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-900 items-center justify-center p-6">
      <div className="flex w-full max-w-4xl bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-700/50">
        
        {/* LEFT COLUMN: BRANDING & WELCOME */}
        <div className="w-1/2 p-12 bg-gradient-to-br from-teal-500 to-teal-800 text-white flex flex-col justify-between hidden md:flex">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-bold text-teal-600 shadow-md">
              S
            </div>
            <h1 className="text-3xl font-bold tracking-tight mt-8">SME Enterprise CRM & Sales</h1>
            <p className="text-teal-100 text-sm mt-3 leading-relaxed">
              A production-ready full-stack customer relationship management and pipeline monitoring platform designed specifically for Small & Medium Enterprises.
            </p>
          </div>
          <div className="text-xs text-teal-200">
            &copy; 2026 SME CRM. Powered by Node.js, React, and Prisma.
          </div>
        </div>

        {/* RIGHT COLUMN: AUTHENTICATION FORM */}
        <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
            <p className="text-slate-400 text-sm mt-1">Please sign in to access your dashboard</p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-semibold text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                required
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-slate-750 border border-slate-700 py-3 px-4 text-sm text-white outline-none focus:border-teal-500 transition duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-slate-750 border border-slate-700 py-3 px-4 text-sm text-white outline-none focus:border-teal-500 transition duration-200"
              />
            </div>

            <button
              type="submit"
              disabled={loadingState}
              className="w-full rounded-xl bg-teal-500 py-3 px-4 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:bg-slate-700 focus:outline-none"
            >
              {loadingState ? (
                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* QUICK DEMO CREDENTIALS BOX */}
          <div className="mt-8 border-t border-slate-700/60 pt-6">
            <p className="text-slate-400 text-xs font-semibold mb-3">Quick Login (Demo Accounts):</p>
            <div className="grid grid-cols-2 gap-2">
              {demoUsers.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleFillCredentials(item.email, item.pass)}
                  className="rounded-lg bg-slate-700/40 border border-slate-700/60 py-1.5 px-3 text-[11px] font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  Fill {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;
