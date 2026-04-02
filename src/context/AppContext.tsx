import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { MenuItem, Pedido, AppConfig } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';

interface AppState {
  menuItems: MenuItem[];
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  pedidos: Pedido[];
  setPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  loadingMenu: boolean;
  refetchPedidos: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

const CONFIG_DEFAULT: AppConfig = {
  whatsapp_nati: '5492994000000',
  datos_bancarios: 'Alias: MUNDO.PRANA\nCBU: 0000000000000000000000\nTitular: Mundo Prana',
  mensaje_bienvenida: '¡Bienvenido/a a Mundo Prana! 🌿',
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { role, cliente, session } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [config, setConfig] = useState<AppConfig>(CONFIG_DEFAULT);
  const [loadingMenu, setLoadingMenu] = useState(true);

  // Cargar menú (público)
  useEffect(() => {
    const fetchMenu = async () => {
      const { data } = await supabase
        .from('prana_menu')
        .select('*')
        .order('orden');
      if (data) setMenuItems(data as MenuItem[]);
      setLoadingMenu(false);
    };
    fetchMenu();
  }, []);

  // Cargar config (pública)
  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.from('prana_config').select('*');
      if (data && data.length > 0) {
        const cfg: AppConfig = { ...CONFIG_DEFAULT };
        data.forEach((row: { clave: string; valor: string }) => {
          if (row.clave === 'whatsapp_nati') cfg.whatsapp_nati = row.valor;
          if (row.clave === 'datos_bancarios') cfg.datos_bancarios = row.valor;
          if (row.clave === 'mensaje_bienvenida') cfg.mensaje_bienvenida = row.valor;
        });
        setConfig(cfg);
      }
    };
    fetchConfig();
  }, []);

  // Cargar pedidos según rol
  const fetchPedidos = async () => {
    if (!session) return;

    let query = supabase
      .from('prana_pedidos')
      .select(`
        *,
        prana_clientes(*),
        prana_pedido_items(*, prana_menu(*))
      `)
      .order('created_at', { ascending: false });

    // Cliente solo ve los suyos
    if (role === 'cliente' && cliente) {
      query = query.eq('cliente_id', cliente.id);
    }

    const { data } = await query;
    if (data) {
      const pedidosMapeados = data.map((p: any) => ({
        ...p,
        cliente: p.prana_clientes,
        items: (p.prana_pedido_items || []).map((i: any) => ({
          ...i,
          menu_item: i.prana_menu,
        })),
      }));
      setPedidos(pedidosMapeados as Pedido[]);
    }
  };

  useEffect(() => {
    if (session && role) fetchPedidos();
    else setPedidos([]);
  }, [session, role, cliente]);

  return (
    <AppContext.Provider value={{
      menuItems, setMenuItems,
      pedidos, setPedidos,
      config, setConfig,
      loadingMenu,
      refetchPedidos: fetchPedidos,
    }}>
      {children}
    </AppContext.Provider>
  );
};
