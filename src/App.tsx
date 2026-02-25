import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Layout from '@/components/layout/Layout';
import NotFound from '@/pages/NotFound';

const Home = lazy(() => import('@/pages/Home'));
const Converter = lazy(() => import('@/pages/Converter'));
const VideoTools = lazy(() => import('@/pages/VideoTools'));
const AITools = lazy(() => import('@/pages/AITools'));
const BgRemover = lazy(() => import('@/pages/BgRemover'));
const ExpandableTabsDemo = lazy(() => import('@/pages/ExpandableTabsDemo'));
const VideoStudio = lazy(() => import('@/pages/VideoStudio'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
  </div>
);

function App() {
  return (
    <HelmetProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="converter" element={<Converter />} />
              <Route path="video-tools" element={<VideoTools />} />
              <Route path="ai-tools" element={<AITools />} />
              <Route path="bg-remover" element={<BgRemover />} />
              <Route path="expandable-tabs" element={<ExpandableTabsDemo />} />
              <Route path="video-studio" element={<VideoStudio />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </HelmetProvider>
  );
}


export default App;
