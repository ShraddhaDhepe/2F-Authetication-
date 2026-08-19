import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Register       from './pages/Register';
import Login          from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard      from './pages/Dashboard';

// Redirect to /login if not authenticated
function PrivateRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  return token ? children : <Navigate to="/login" replace />;
}

// Redirect to /dashboard if already logged in
function PublicRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  return token ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"                element={<Navigate to="/dashboard" replace />} />
      <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/dashboard"       element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="*"                element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
