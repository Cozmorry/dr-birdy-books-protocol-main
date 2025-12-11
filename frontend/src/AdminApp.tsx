import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './admin/store/useAuthStore';
import LoginPage from './admin/pages/LoginPage';
import DashboardLayout from './admin/components/DashboardLayout';
import DashboardPage from './admin/pages/DashboardPage';
import FilesPage from './admin/pages/FilesPage';
import FoldersPage from './admin/pages/FoldersPage';
import FolderDetailPage from './admin/pages/FolderDetailPage';
import BlogPage from './admin/pages/BlogPage';
import FeedbackPage from './admin/pages/FeedbackPage';
import AnalyticsPage from './admin/pages/AnalyticsPage';
import SettingsPage from './admin/pages/SettingsPage';

export default function AdminApp() {
  const { isAuthenticated, isLoading, loadAdmin } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="login"
        element={isAuthenticated ? <Navigate to="/admin" replace /> : <LoginPage />}
      />
      
      <Route
        path="/*"
        element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/admin/login" replace />}
      >
        <Route index element={<DashboardPage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="folders" element={<FoldersPage />} />
        <Route path="folders/:id" element={<FolderDetailPage />} />
        <Route path="blog" element={<BlogPage />} />
        <Route path="feedback" element={<FeedbackPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

