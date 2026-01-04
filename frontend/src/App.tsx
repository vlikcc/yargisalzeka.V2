import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import LandingPage from './pages/marketing/LandingPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import SearchPage from './pages/search/SearchPage';
import SubscriptionPage from './pages/subscription/SubscriptionPage';
import HistoryPage from './pages/history/HistoryPage';
import ProfilePage from './pages/profile/ProfilePage';
import PetitionHistoryPage from './pages/petition/PetitionHistoryPage';
import SavedDecisionsPage from './pages/saved/SavedDecisionsPage';
import EditorPage from '@/pages/editor/EditorPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import SystemMonitoring from './pages/admin/SystemMonitoring';
import PlanManagement from './pages/admin/PlanManagement';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import SecurityPage from './pages/admin/SecurityPage';
import SettingsPage from './pages/admin/SettingsPage';
import AnnouncementsPage from './pages/admin/AnnouncementsPage';
import RevenuePage from './pages/admin/RevenuePage';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { SearchProvider } from './contexts/SearchContext';

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { state } = useAuth();
  if (state.loading) return <div className="p-6">Yükleniyor...</div>;
  if (!state.user) return <Navigate to="/login" replace />;
  return children;
}

function AdminProtectedRoute({ children }: { children: React.ReactElement }) {
  const { state } = useAuth();
  if (state.loading) return <div className="p-6">Yükleniyor...</div>;
  if (!state.user) return <Navigate to="/login" replace />;

  // Admin rolü kontrolü
  const isAdmin = state.user.role === 'Admin' || state.user.role === 'SuperAdmin';
  if (!isAdmin) return <Navigate to="/app" replace />;

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Suspense fallback={<div className="p-4">Yükleniyor...</div>}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/app/*"
              element={
                <ProtectedRoute>
                  <SubscriptionProvider>
                    <SearchProvider>
                      <AppLayout>
                        <Routes>
                          <Route index element={<DashboardPage />} />
                          <Route path="search" element={<SearchPage />} />
                          <Route path="subscription" element={<SubscriptionPage />} />
                          <Route path="history" element={<HistoryPage />} />
                          <Route path="profile" element={<ProfilePage />} />
                          <Route path="petitions" element={<PetitionHistoryPage />} />
                          <Route path="saved" element={<SavedDecisionsPage />} />
                          <Route path="editor" element={<EditorPage />} />
                          <Route path="editor/:id" element={<EditorPage />} />
                        </Routes>
                      </AppLayout>
                    </SearchProvider>
                  </SubscriptionProvider>
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/*"
              element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route index element={<AdminDashboard />} />
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="plans" element={<PlanManagement />} />
                      <Route path="users" element={<UserManagement />} />
                      <Route path="monitoring" element={<SystemMonitoring />} />
                      <Route path="analytics" element={<AnalyticsPage />} />
                      <Route path="security" element={<SecurityPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="announcements" element={<AnnouncementsPage />} />
                      <Route path="revenue" element={<RevenuePage />} />
                    </Routes>
                  </AppLayout>
                </AdminProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AuthProvider>
  );
}
