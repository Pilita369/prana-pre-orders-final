import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppProvider } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import { Loader2 } from "lucide-react";

import MenuPage from "./pages/MenuPage";
import LoginPage from "./pages/LoginPage";
import RegistroPage from "./pages/RegistroPage";
import NuevoPedidoPage from "./pages/NuevoPedidoPage";
import HistorialPage from "./pages/HistorialPage";
import AdminPage from "./pages/AdminPage";
import SuperadminPage from "./pages/SuperadminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const IndexRedirect = () => {
  const { role, loading, session } = useAuth();
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!session) return <Navigate to="/menu" replace />;
  if (role === 'superadmin') return <Navigate to="/superadmin" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/pedido/nuevo" replace />;
};

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles: string[] }) => {
  const { role, loading, session } = useAuth();
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!session) return <Navigate to="/login" replace />;
  if (!role) return <Navigate to="/login" replace />;
  if (!roles.includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <Navbar />
            <Routes>
              <Route path="/" element={<IndexRedirect />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegistroPage />} />
              <Route path="/pedido/nuevo" element={
                <ProtectedRoute roles={['cliente']}>
                  <NuevoPedidoPage />
                </ProtectedRoute>
              } />
              <Route path="/pedido/historial" element={
                <ProtectedRoute roles={['cliente']}>
                  <HistorialPage />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute roles={['admin', 'superadmin']}>
                  <AdminPage />
                </ProtectedRoute>
              } />
              <Route path="/superadmin" element={
                <ProtectedRoute roles={['superadmin']}>
                  <SuperadminPage />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;