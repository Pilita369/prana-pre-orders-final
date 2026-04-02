-- ============================================
-- Preventa Mundo Prana — Schema SQL
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Roles de usuario
create table prana_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  role text not null check (role in ('superadmin', 'admin', 'cliente'))
);

-- Clientes
create table prana_clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  nombre text not null,
  apellido text not null,
  email text not null,
  telefono text,
  direccion_default text,
  created_at timestamptz default now()
);

-- Items del menú
create table prana_menu (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio numeric not null default 12000,
  activo boolean default true,
  orden int default 0,
  created_at timestamptz default now()
);

-- Pedidos
create table prana_pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references prana_clientes not null,
  total numeric not null,
  metodo_pago text check (metodo_pago in ('efectivo', 'transferencia')),
  necesita_envio boolean default false,
  direccion_envio text,
  comentarios text,
  estado text default 'pendiente' check (estado in ('pendiente', 'en_preparacion', 'listo', 'entregado')),
  fecha_pedido timestamptz default now(),
  created_at timestamptz default now()
);

-- Items de cada pedido
create table prana_pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references prana_pedidos not null,
  menu_item_id uuid references prana_menu not null,
  cantidad int not null,
  precio_unitario numeric not null
);

-- Configuración general
create table prana_config (
  id uuid primary key default gen_random_uuid(),
  clave text not null unique,
  valor text
);

-- RLS
alter table prana_roles enable row level security;
alter table prana_clientes enable row level security;
alter table prana_menu enable row level security;
alter table prana_pedidos enable row level security;
alter table prana_pedido_items enable row level security;
alter table prana_config enable row level security;
