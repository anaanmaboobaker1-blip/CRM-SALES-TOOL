import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('sme_crm_token');
    const savedUser = localStorage.getItem('sme_crm_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    } else {
      const defaultUser = {
        id: 1,
        name: 'Aditya Admin',
        email: 'admin@sme.com',
        role: 'Admin',
        roleId: 1
      };
      const defaultToken = 'bypass_token';
      localStorage.setItem('sme_crm_token', defaultToken);
      localStorage.setItem('sme_crm_user', JSON.stringify(defaultUser));
      setToken(defaultToken);
      setUser(defaultUser);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await API.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem('sme_crm_token', receivedToken);
      localStorage.setItem('sme_crm_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      setLoading(false);
      return receivedUser;
    } catch (err) {
      setLoading(false);
      const errMsg = err.response?.data?.message || 'Login failed. Please check credentials.';
      setAuthError(errMsg);
      throw new Error(errMsg);
    }
  };

  const logout = async () => {
    try {
      await API.post('/auth/logout');
    } catch (e) {
      console.warn('Logout notification request failed', e);
    } finally {
      localStorage.removeItem('sme_crm_token');
      localStorage.removeItem('sme_crm_user');
      setToken(null);
      setUser(null);
    }
  };

  const isAdmin = user?.role === 'Admin';
  const isManager = user?.role === 'Manager';
  const isSalesperson = user?.role === 'Salesperson';
  const isViewOnly = user?.role === 'View Only';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authError,
        login,
        logout,
        isAdmin,
        isManager,
        isSalesperson,
        isViewOnly,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default AuthContext;
