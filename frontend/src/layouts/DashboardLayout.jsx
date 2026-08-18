import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  DollarSign,
  Kanban,
  CalendarCheck,
  FileSpreadsheet,
  ShoppingCart,
  Contact,
  BarChart3,
  GitCompare,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  User
} from 'lucide-react';

function DashboardLayout() {
  const { user, logout, isAdmin, isManager } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Load mock/real notifications for user
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Query reports/stats which lists counts, or just get from an endpoint
        // To be safe and robust, let's load notifications. We'll default to a clean list if API fails
        setNotifications([
          { id: 1, title: 'New Lead Assigned', message: 'Lead Rohan Joshi has been assigned to you.', date: 'Just now', isRead: false },
          { id: 2, title: 'Deal closing date approaching', message: 'Deal Cloud Data Migration is closing in 3 days.', date: '2 hours ago', isRead: false },
          { id: 3, title: 'Quotation Accepted', message: 'Quotation QT-2026-00001 has been accepted.', date: 'Yesterday', isRead: true },
        ]);
      } catch (e) {
        console.error(e);
      }
    };
    fetchNotifications();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Leads', path: '/leads', icon: UserPlus },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Deals', path: '/deals', icon: DollarSign },
    { name: 'Sales Pipeline', path: '/pipeline', icon: Kanban },
    { name: 'Tasks & Follow-ups', path: '/tasks', icon: CalendarCheck },
    { name: 'Quotations', path: '/quotations', icon: FileSpreadsheet },
    { name: 'Sales Orders', path: '/orders', icon: ShoppingCart },
    { name: 'Sales Team', path: '/team', icon: Contact },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Integrations', path: '/integrations', icon: GitCompare },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* SIDEBAR FOR DESKTOP */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } fixed inset-y-0 left-0 z-20 flex flex-col bg-slate-900 text-slate-100 transition-all duration-300 ease-in-out lg:static lg:block`}
      >
        {/* LOGO */}
        <div className="flex h-16 items-center justify-between px-6 bg-slate-950">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500 font-bold text-white shadow-lg shadow-teal-500/20">
              S
            </div>
            {sidebarOpen && (
              <span className="text-lg font-bold tracking-wider text-white">SME CRM</span>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-teal-500 text-white shadow-md shadow-teal-500/10'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* USER PROFILE INFO ON FOOTER */}
        <div className="border-t border-slate-800 p-4 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800">
              <User className="h-5 w-5 text-slate-400" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{user?.name}</p>
                <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-400">
                  {user?.role}
                </span>
              </div>
            )}
            <button
              onClick={logout}
              title="Logout"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TOPBAR */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
          {/* Left search */}
          <form onSubmit={handleSearch} className="relative w-96 max-w-lg">
            <input
              type="search"
              placeholder="Search across CRM (Press Enter)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none transition-all duration-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          </form>

          {/* Right notifications and profile info */}
          <div className="flex items-center gap-4">
            {/* Notification button */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl ring-1 ring-black/5 z-30">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-semibold text-slate-900 text-sm">Notifications</span>
                    <button
                      onClick={markAllRead}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div className="mt-2 max-h-60 overflow-y-auto space-y-3 py-1">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`rounded-lg p-2 transition-all ${
                          n.isRead ? 'bg-white' : 'bg-teal-50/40'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-xs text-slate-800">{n.title}</span>
                          <span className="text-[10px] text-slate-400">{n.date}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">{n.message}</p>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile view */}
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-800">{user?.name}</p>
                <p className="text-[10px] text-slate-400 font-medium">{user?.role}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 font-bold text-white shadow-md shadow-teal-500/20">
                {user?.name?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* SCROLLABLE ROUTE VIEW */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
