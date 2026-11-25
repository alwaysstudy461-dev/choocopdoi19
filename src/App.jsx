import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { OcopProvider } from './context/OcopContext.jsx';
import HomePage from './pages/HomePage.jsx';

const ProductsPage = lazy(() => import('./pages/ProductsPage.jsx'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage.jsx'));
const TracePage = lazy(() => import('./pages/TracePage.jsx'));
const AiSellPage = lazy(() => import('./pages/AiSellPage.jsx'));
const OrdersCartPage = lazy(() => import('./pages/OrdersCartPage.jsx'));
const FarmerOrdersPage = lazy(() => import('./pages/FarmerOrdersPage.jsx'));

function PageFallback() {
  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-6 py-10">
      <div className="bg-white rounded-panel p-8 border border-forest-dark/10 shadow-soft space-y-3">
        <div className="h-5 w-48 rounded-full ai-shimmer" />
        <div className="h-4 w-full max-w-md rounded-full ai-shimmer" />
        <div className="h-32 w-full rounded-2xl ai-shimmer" />
      </div>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <OcopProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/index.html" element={<HomePage />} />
              <Route path="/san-pham" element={<ProductsPage />} />
              <Route path="/san-pham.html" element={<ProductsPage />} />
              <Route path="/san-pham/:slug" element={<ProductDetailPage />} />
              <Route path="/vung/:regionSlug" element={<ProductsPage />} />
              <Route path="/chi-tiet-san-pham" element={<ProductDetailPage />} />
              <Route path="/chi-tiet-san-pham.html" element={<ProductDetailPage />} />
              <Route path="/truy-xuat" element={<TracePage />} />
              <Route path="/truy-xuat.html" element={<TracePage />} />
              <Route path="/dang-ban-ai" element={<AiSellPage />} />
              <Route path="/dang-ban-ai.html" element={<AiSellPage />} />
              <Route path="/don-hang" element={<OrdersCartPage />} />
              <Route path="/don-hang.html" element={<OrdersCartPage />} />
              <Route path="/quan-ly-don" element={<FarmerOrdersPage />} />
              <Route path="/quan-ly-don.html" element={<FarmerOrdersPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </OcopProvider>
    </BrowserRouter>
  );
}
