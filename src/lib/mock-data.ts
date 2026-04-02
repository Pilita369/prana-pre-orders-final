import { MenuItem, Pedido, Cliente, AppConfig, UserRole } from './types';

export const MENU_ITEMS: MenuItem[] = [
  { id: '1', nombre: 'Albóndigas caseras con salsa de tomate y arroz yamani', descripcion: 'Albóndigas de carne vacuna con salsa de tomate natural y arroz yamani.', precio: 12000, activo: true, orden: 1 },
  { id: '2', nombre: 'Bife magro grillado con puré rústico de calabaza y zanahoria', descripcion: 'Carne tierna y magra sellada a la plancha con puré rústico de calabaza y zanahoria asada, con aceite de oliva y pimienta negra.', precio: 12000, activo: true, orden: 2 },
  { id: '3', nombre: 'Bondiola braseada con batata asada y coliflor', descripcion: 'Bondiola cocida lentamente hasta quedar tierna, con batata asada y coliflor dorado.', precio: 12000, activo: true, orden: 3 },
  { id: '4', nombre: 'Chop suey de pollo', descripcion: 'Vegetales salteados de zanahoria, zucchini, berenjena, morrón y cebolla con tiras de pechuga y salsa de soja.', precio: 12000, activo: true, orden: 4 },
  { id: '5', nombre: 'Lentejas guisadas con vegetales y carne', descripcion: 'Guiso de lentejas con carne vacuna, zanahoria, zapallo y vegetales de estación.', precio: 12000, activo: true, orden: 5 },
  { id: '6', nombre: 'Merluza al horno con vegetales asados', descripcion: 'Filet de merluza al horno con zapallito zucchini, zanahoria y morrones asados.', precio: 12000, activo: true, orden: 6 },
  { id: '7', nombre: 'Pollo al horno al limón con vegetales', descripcion: 'Pollo al horno con finas hierbas con guarnición de brócoli, zanahoria, berenjena y zucchini horneados.', precio: 12000, activo: true, orden: 7 },
  { id: '8', nombre: 'Roll integral de pollo, mix de vegetales y mozzarella', descripcion: 'Roll integral relleno con pollo, vegetales salteados (zanahoria, zapallito, cebolla y berenjena) con mozzarella gratinada.', precio: 12000, activo: true, orden: 8 },
  { id: '9', nombre: 'Tarta integral de acelga, mozzarella y huevo', descripcion: 'Base integral con relleno de acelga salteada, huevo y mozzarella gratinada.', precio: 12000, activo: true, orden: 9 },
  { id: '10', nombre: 'Tarta integral de pollo, muzza y huevo', descripcion: 'Tartaleta integral rellena con pollo desmenuzado, zanahoria, berenjena, zucchini, cebolla y morrón salteado.', precio: 12000, activo: true, orden: 10 },
];

export const MOCK_CONFIG: AppConfig = {
  whatsapp_nati: '5491112345678',
  datos_bancarios: 'Banco Nación\nCBU: 0110000000000000000000\nAlias: MUNDO.PRANA\nTitular: Natalia García',
  mensaje_bienvenida: '¡Bienvenido a Mundo Prana! 🌿 Viandas congeladas caseras y saludables.',
};

export const MOCK_CLIENTES: Cliente[] = [
  { id: 'c1', user_id: 'u1', nombre: 'María', apellido: 'González', email: 'maria@test.com', telefono: '1155001234', direccion_default: 'Av. Rivadavia 1234, CABA', created_at: new Date().toISOString() },
  { id: 'c2', user_id: 'u2', nombre: 'Juan', apellido: 'Pérez', email: 'juan@test.com', telefono: '1155005678', direccion_default: 'Calle Falsa 123, Quilmes', created_at: new Date().toISOString() },
];

export const MOCK_PEDIDOS: Pedido[] = [
  {
    id: 'p1', cliente_id: 'c1', total: 36000, metodo_pago: 'transferencia', necesita_envio: true,
    direccion_envio: 'Av. Rivadavia 1234, CABA', comentarios: 'Sin sal extra por favor', estado: 'pendiente',
    fecha_pedido: new Date().toISOString(),
    items: [
      { id: 'pi1', pedido_id: 'p1', menu_item_id: '1', cantidad: 2, precio_unitario: 12000 },
      { id: 'pi2', pedido_id: 'p1', menu_item_id: '4', cantidad: 1, precio_unitario: 12000 },
    ],
    cliente: MOCK_CLIENTES[0],
  },
  {
    id: 'p2', cliente_id: 'c2', total: 24000, metodo_pago: 'efectivo', necesita_envio: false,
    estado: 'en_preparacion', fecha_pedido: new Date().toISOString(),
    items: [
      { id: 'pi3', pedido_id: 'p2', menu_item_id: '7', cantidad: 1, precio_unitario: 12000 },
      { id: 'pi4', pedido_id: 'p2', menu_item_id: '9', cantidad: 1, precio_unitario: 12000 },
    ],
    cliente: MOCK_CLIENTES[1],
  },
];

// Mock auth state
let currentRole: UserRole | null = null;
let currentCliente: Cliente | null = null;

export const mockAuth = {
  getRole: () => currentRole,
  getCliente: () => currentCliente,
  login: (role: UserRole) => {
    currentRole = role;
    if (role === 'cliente') currentCliente = MOCK_CLIENTES[0];
  },
  logout: () => { currentRole = null; currentCliente = null; },
};
