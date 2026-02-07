import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import './styles/index.css';

// Pages
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Changes from './pages/admin/Changes';
import Import from './pages/admin/Import';
import Definitions from './pages/admin/Definitions';
import PublicForm from './pages/PublicForm';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicForm />} />

      {/* Admin Routes */}
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/admin/changes" element={
        <ProtectedRoute><Changes /></ProtectedRoute>
      } />
      <Route path="/admin/import" element={
        <ProtectedRoute><Import /></ProtectedRoute>
      } />
      <Route path="/admin/definitions" element={
        <ProtectedRoute><Definitions /></ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#f8fafc',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#f8fafc',
              },
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
