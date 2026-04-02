export type UserRole = 'superadmin' | 'admin' | 'cliente';

export interface MenuItem {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  activo: boolean;
  orden: number;
}

export interface Cliente {
  id: string;
  user_id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  direccion_default?: string;
  created_at: string;
}

export interface Pedido {
  id: string;
  cliente_id: string;
  total: number;
  metodo_pago: 'efectivo' | 'transferencia';
  necesita_envio: boolean;
  direccion_envio?: string;
  comentarios?: string;
  estado: 'pendiente' | 'en_preparacion' | 'listo' | 'entregado';
  fecha_pedido: string;
  items: PedidoItem[];
  cliente?: Cliente;
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  menu_item_id: string;
  cantidad: number;
  precio_unitario: number;
  menu_item?: MenuItem;
}

export interface AppConfig {
  whatsapp_nati: string;
  datos_bancarios: string;
  mensaje_bienvenida: string;
}
