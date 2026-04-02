import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole, Cliente, AppConfig, Pedido } from '@/lib/types';
import { MOCK_CLIENTES, MOCK_PEDIDOS, MOCK_CONFIG, MENU_ITEMS } from '@/lib/mock-data';
import { MenuItem } from '@/lib/types';

interface AuthState {
  isLoggedIn: boolean;
  role: UserRole | null;
  cliente: Cliente | null;
  login: (email: string, password: string, role?: UserRole) => boolean;
  register: (data: { nombre: string; apellido: string; email: string; telefono?: string }) => boolean;
  logout: () => void;
}

interface AppState {
  auth: AuthState;
  pedidos: Pedido[];
  setPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  menuItems: MenuItem[];
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  clientes: Cliente[];
}

const AppContext = createContext<AppState | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>(MOCK_PEDIDOS);
  const [config, setConfig] = useState<AppConfig>(MOCK_CONFIG);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);

  const login = (email: string, _password: string, forceRole?: UserRole): boolean => {
    if (email === 'admin@prana.com') {
      setRole('admin');
      setIsLoggedIn(true);
      return true;
    }
    if (email === 'super@prana.com') {
      setRole('superadmin');
      setIsLoggedIn(true);
      return true;
    }
    setRole(forceRole || 'cliente');
    setCliente(MOCK_CLIENTES[0]);
    setIsLoggedIn(true);
    return true;
  };

  const register = (data: { nombre: string; apellido: string; email: string; telefono?: string }): boolean => {
    const newCliente: Cliente = {
      id: `c${Date.now()}`,
      user_id: `u${Date.now()}`,
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      telefono: data.telefono,
      created_at: new Date().toISOString(),
    };
    setCliente(newCliente);
    setRole('cliente');
    setIsLoggedIn(true);
    return true;
  };

  const logout = () => {
    setIsLoggedIn(false);
    setRole(null);
    setCliente(null);
  };

  return (
    <AppContext.Provider value={{
      auth: { isLoggedIn, role, cliente, login, register, logout },
      pedidos, setPedidos, config, setConfig, menuItems, setMenuItems,
      clientes: MOCK_CLIENTES,
    }}>
      {children}
    </AppContext.Provider>
  );
};
