import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
import MenuPage from "./pages/MenuPage";
import LoginPage from "./pages/LoginPage";
import RegistroPage from "./pages/RegistroPage";
import NuevoPedidoPage from "./pages/NuevoPedidoPage";
import HistorialPage from "./pages/HistorialPage";
import AdminPage from "./pages/AdminPage";
import SuperadminPage from "./pages/SuperadminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AppProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegistroPage />} />
            <Route path="/pedido/nuevo" element={<NuevoPedidoPage />} />
            <Route path="/pedido/historial" element={<HistorialPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/superadmin" element={<SuperadminPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
