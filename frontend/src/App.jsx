import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, getRoleLandingPath } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleRoute } from './routes/RoleRoute';

import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Production from './pages/Production';
import Quality from './pages/Quality';
import Dispatch from './pages/Dispatch';
import Workers from './pages/Workers';
import Finance from './pages/Finance';
import BuyerOrders from './pages/BuyerOrders';
import UsersPage from './pages/UsersPage';

function RootRedirect() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={getRoleLandingPath(user.role)} replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Protected Application Routes inside Layout */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route
              path="/dashboard"
              element={
                <RoleRoute allowedRoles={['admin', 'accounts']}>
                  <Dashboard />
                </RoleRoute>
              }
            />

            <Route
              path="/inventory"
              element={
                <RoleRoute allowedRoles={['admin', 'store_manager']}>
                  <Inventory />
                </RoleRoute>
              }
            />

            <Route
              path="/orders"
              element={
                <RoleRoute allowedRoles={['admin', 'store_manager']}>
                  <Orders />
                </RoleRoute>
              }
            />

            <Route
              path="/production"
              element={
                <RoleRoute allowedRoles={['admin', 'production_operator']}>
                  <Production />
                </RoleRoute>
              }
            />

            <Route
              path="/quality"
              element={
                <RoleRoute allowedRoles={['admin', 'quality_inspector']}>
                  <Quality />
                </RoleRoute>
              }
            />

            <Route
              path="/dispatch"
              element={
                <RoleRoute allowedRoles={['admin', 'store_manager']}>
                  <Dispatch />
                </RoleRoute>
              }
            />

            <Route
              path="/workers"
              element={
                <RoleRoute allowedRoles={['admin', 'accounts']}>
                  <Workers />
                </RoleRoute>
              }
            />

            <Route
              path="/finance"
              element={
                <RoleRoute allowedRoles={['admin', 'accounts']}>
                  <Finance />
                </RoleRoute>
              }
            />

            <Route
              path="/place-order"
              element={
                <RoleRoute allowedRoles={['buyer']}>
                  <BuyerOrders initialView="place_order" />
                </RoleRoute>
              }
            />

            <Route
              path="/my-orders"
              element={
                <RoleRoute allowedRoles={['buyer']}>
                  <BuyerOrders initialView="my_orders" />
                </RoleRoute>
              }
            />

            <Route
              path="/users"
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <UsersPage />
                </RoleRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
