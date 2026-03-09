import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import NotFound from '@/pages/NotFound';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const Home = lazy(() => import('@/pages/Home'));
const Converter = lazy(() => import('@/pages/Converter'));
const VideoTools = lazy(() => import('@/pages/VideoTools'));
const AITools = lazy(() => import('@/pages/AITools'));
const BgRemover = lazy(() => import('@/pages/BgRemover'));
const ExpandableTabsDemo = lazy(() => import('@/pages/ExpandableTabsDemo'));
const VideoStudio = lazy(() => import('@/pages/VideoStudio'));
const ImageEditor = lazy(() => import('@/pages/ImageEditor'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
  </div>
);

function App() {
  const appContent = (
    <Router>
      {/* Global toast notifications — z-50 keeps them above all content */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'hsl(222.2 84% 4.9%)',
            color: '#fff',
            border: '1px solid hsl(217.2 32.6% 17.5%)',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
          },
          success: {
            iconTheme: { primary: '#8b5cf6', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="expandable-tabs" element={<ExpandableTabsDemo />} />

            {/* Public Auth Routes */}
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="verify-email" element={<VerifyEmail />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route path="converter" element={<ProtectedRoute><Converter /></ProtectedRoute>} />
            <Route path="video-tools" element={<ProtectedRoute><VideoTools /></ProtectedRoute>} />
            <Route path="ai-tools" element={<ProtectedRoute><AITools /></ProtectedRoute>} />
            <Route path="bg-remover" element={<ProtectedRoute><BgRemover /></ProtectedRoute>} />
            <Route path="video-studio" element={<ProtectedRoute><VideoStudio /></ProtectedRoute>} />
            <Route path="image-editor" element={<ProtectedRoute><ImageEditor /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );

  return (
    <HelmetProvider>
      <AuthProvider>
        {appContent}
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
