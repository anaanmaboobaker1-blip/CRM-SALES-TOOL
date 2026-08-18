import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';

// Pages lazy/direct imports (we will write these next)
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Customers from './pages/Customers';
import CustomerProfile from './pages/CustomerProfile';
import Deals from './pages/Deals';
import SalesPipeline from './pages/SalesPipeline';
import TasksFollowUps from './pages/TasksFollowUps';
import Quotations from './pages/Quotations';
import SalesOrders from './pages/SalesOrders';
import SalesTeam from './pages/SalesTeam';
import Reports from './pages/Reports';
import SearchResults from './pages/SearchResults';
import Integrations from './pages/Integrations';
import Settings from './pages/Settings';

const ProtectedRoute = ({ children }) => {
  return children;
};

function App() {
  return (
    <Routes>
      {/* Dashboards Routes */}
      <Route
        path="/*"
        element={<DashboardLayout />}
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerProfile />} />
        <Route path="deals" element={<Deals />} />
        <Route path="pipeline" element={<SalesPipeline />} />
        <Route path="tasks" element={<TasksFollowUps />} />
        <Route path="quotations" element={<Quotations />} />
        <Route path="orders" element={<SalesOrders />} />
        <Route path="team" element={<SalesTeam />} />
        <Route path="reports" element={<Reports />} />
        <Route path="search" element={<SearchResults />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
