import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const clearError = () => setError(null);

  // ── Register ───────────────────────────────────────────────────────────────
  const register = useCallback(async (email, password, phone) => {
    setLoading(true); setError(null);
    try {
      const res = await api.post('/auth/register', { email, password, phone });
      const { user: u, accessToken, refreshToken } = res.data.data;
      localStorage.setItem('accessToken',  accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(u));
      setUser(u);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      setError(msg);
      return { success: false, message: msg };
    } finally { setLoading(false); }
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setLoading(true); setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.requires2FA) {
        return { success: true, requires2FA: true, userId: res.data.userId };
      }
      const { user: u, accessToken, refreshToken } = res.data.data;
      localStorage.setItem('accessToken',  accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(u));
      setUser(u);
      return { success: true, requires2FA: false };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed.';
      setError(msg);
      return { success: false, message: msg };
    } finally { setLoading(false); }
  }, []);

  // ── Verify 2FA (login flow) ────────────────────────────────────────────────
  const verify2FALogin = useCallback(async (otp, userId) => {
    setLoading(true); setError(null);
    try {
      const res = await api.post('/auth/2fa/verify', { otp, userId });
      const { user: u, accessToken, refreshToken } = res.data.data;
      localStorage.setItem('accessToken',  accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(u));
      setUser(u);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || '2FA verification failed.';
      setError(msg);
      return { success: false, message: msg };
    } finally { setLoading(false); }
  }, []);

  // ── Enable 2FA ─────────────────────────────────────────────────────────────
  const enable2FA = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.post('/auth/2fa/enable');
      return { success: true, message: res.data.message };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to enable 2FA.';
      setError(msg);
      return { success: false, message: msg };
    } finally { setLoading(false); }
  }, []);

  // ── Verify 2FA setup ───────────────────────────────────────────────────────
  const verify2FASetup = useCallback(async (otp) => {
    setLoading(true); setError(null);
    try {
      await api.post('/auth/2fa/verify', { otp });
      const newUser = { ...user, is_2fa_enabled: true };
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || '2FA verification failed.';
      setError(msg);
      return { success: false, message: msg };
    } finally { setLoading(false); }
  }, [user]);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try { await api.post('/auth/logout', { refreshToken }); } catch (_) {}
    localStorage.clear();
    setUser(null);
  }, []);

  // ── Forgot Password ────────────────────────────────────────────────────────
  const forgotPassword = useCallback(async (phone) => {
    setLoading(true); setError(null);
    try {
      const res = await api.post('/auth/forgot-password', { phone });
      return { success: true, userId: res.data.userId, message: res.data.message };
    } catch (err) {
      const msg = err.response?.data?.message || 'Request failed.';
      setError(msg);
      return { success: false, message: msg };
    } finally { setLoading(false); }
  }, []);

  // ── Reset Password ─────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (userId, otp, newPassword) => {
    setLoading(true); setError(null);
    try {
      const res = await api.post('/auth/reset-password', { userId, otp, newPassword });
      return { success: true, message: res.data.message };
    } catch (err) {
      const msg = err.response?.data?.message || 'Reset failed.';
      setError(msg);
      return { success: false, message: msg };
    } finally { setLoading(false); }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, error, clearError,
      register, login, verify2FALogin,
      enable2FA, verify2FASetup,
      logout, forgotPassword, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
