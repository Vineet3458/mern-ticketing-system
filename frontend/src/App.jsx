import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage.jsx';
import { RegisterPage } from './pages/auth/RegisterPage.jsx';
import { VerifyOtpPage } from './pages/auth/VerifyOtpPage.jsx';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage.jsx';
import { AppShell } from './components/layout/AppShell.jsx';
import { ProtectedRoute, RoleRoute } from './routes/ProtectedRoute.jsx';
import { DashboardPage } from './pages/dashboard/DashboardPage.jsx';
import { TicketListPage } from './pages/tickets/TicketListPage.jsx';
import { CreateTicketPage } from './pages/tickets/CreateTicketPage.jsx';
import { TicketDetailPage } from './pages/tickets/TicketDetailPage.jsx';
import { UserProfilePage } from './pages/profile/UserProfilePage.jsx';
import { AdminUsersPage } from './pages/admin/AdminUsersPage.jsx';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Authenticated Application Shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tickets" element={<TicketListPage />} />
          <Route path="/tickets/create" element={<CreateTicketPage />} />
          <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
          <Route path="/profile" element={<UserProfilePage />} />

          {/* Admin Protected Operations */}
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
