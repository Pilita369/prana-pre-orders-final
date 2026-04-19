import { Navigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';

const Index = () => {
  const { auth } = useApp();

  if (!auth.isLoggedIn) return <Navigate to="/menu" replace />;
  if (auth.role === 'superadmin') return <Navigate to="/superadmin" replace />;
  if (auth.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/pedido/nuevo" replace />;
};

export default Index;
