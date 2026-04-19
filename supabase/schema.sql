-- ============================================
-- Preventa Mundo Prana — Schema SQL completo
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- TABLAS
-- ============================================

-- Roles de usuario
create table if not exists prana_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  role text not null check (role in ('superadmin', 'admin', 'cliente'))
);

-- Clientes
create table if not exists prana_clientes (
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
create table if not exists prana_menu (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio numeric not null default 12000,
  activo boolean default true,
  orden int default 0,
  created_at timestamptz default now()
);

-- Pedidos
create table if not exists prana_pedidos (
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
create table if not exists prana_pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references prana_pedidos not null,
  menu_item_id uuid references prana_menu not null,
  cantidad int not null,
  precio_unitario numeric not null
);

-- Configuración general
create table if not exists prana_config (
  id uuid primary key default gen_random_uuid(),
  clave text not null unique,
  valor text
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table prana_roles enable row level security;
alter table prana_clientes enable row level security;
alter table prana_menu enable row level security;
alter table prana_pedidos enable row level security;
alter table prana_pedido_items enable row level security;
alter table prana_config enable row level security;

-- ============================================
-- FUNCIÓN AUXILIAR PARA CHEQUEAR ROL ADMIN
-- (security definer = corre con permisos del dueño de la función)
-- ============================================

create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists(
    select 1 from prana_roles
    where user_id = auth.uid()
      and role in ('admin', 'superadmin')
  );
$$;

-- ============================================
-- POLÍTICAS: prana_roles
-- ============================================

-- Cualquier usuario autenticado puede leer su propio rol
create policy "roles: leer propio"
  on prana_roles for select
  to authenticated
  using (user_id = auth.uid());

-- Admins pueden leer todos los roles
create policy "roles: admin lee todos"
  on prana_roles for select
  to authenticated
  using (is_admin());

-- Solo se puede insertar un rol para uno mismo (durante registro)
create policy "roles: insertar propio"
  on prana_roles for insert
  to authenticated
  with check (user_id = auth.uid());

-- Admins pueden actualizar roles
create policy "roles: admin actualiza"
  on prana_roles for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ============================================
-- POLÍTICAS: prana_clientes
-- ============================================

-- Cada cliente puede leer y actualizar su propio perfil
create policy "clientes: leer propio"
  on prana_clientes for select
  to authenticated
  using (user_id = auth.uid());

create policy "clientes: actualizar propio"
  on prana_clientes for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Solo se puede insertar para uno mismo (durante registro)
create policy "clientes: insertar propio"
  on prana_clientes for insert
  to authenticated
  with check (user_id = auth.uid());

-- Admins pueden leer todos los clientes
create policy "clientes: admin lee todos"
  on prana_clientes for select
  to authenticated
  using (is_admin());

-- ============================================
-- POLÍTICAS: prana_menu
-- ============================================

-- El menú es público (cualquiera puede verlo, incluso sin login)
create policy "menu: lectura publica"
  on prana_menu for select
  to anon, authenticated
  using (true);

-- Solo admins pueden modificar el menú
create policy "menu: admin inserta"
  on prana_menu for insert
  to authenticated
  with check (is_admin());

create policy "menu: admin actualiza"
  on prana_menu for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "menu: admin elimina"
  on prana_menu for delete
  to authenticated
  using (is_admin());

-- ============================================
-- POLÍTICAS: prana_pedidos
-- ============================================

-- Clientes ven solo sus propios pedidos
create policy "pedidos: cliente lee propios"
  on prana_pedidos for select
  to authenticated
  using (
    cliente_id in (
      select id from prana_clientes where user_id = auth.uid()
    )
  );

-- Clientes pueden crear pedidos propios
create policy "pedidos: cliente inserta"
  on prana_pedidos for insert
  to authenticated
  with check (
    cliente_id in (
      select id from prana_clientes where user_id = auth.uid()
    )
  );

-- Admins pueden leer todos los pedidos
create policy "pedidos: admin lee todos"
  on prana_pedidos for select
  to authenticated
  using (is_admin());

-- Admins pueden actualizar cualquier pedido (cambiar estado, editar)
create policy "pedidos: admin actualiza"
  on prana_pedidos for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- Admins pueden eliminar pedidos
create policy "pedidos: admin elimina"
  on prana_pedidos for delete
  to authenticated
  using (is_admin());

-- ============================================
-- POLÍTICAS: prana_pedido_items
-- ============================================

-- Clientes ven los items de sus propios pedidos
create policy "pedido_items: cliente lee propios"
  on prana_pedido_items for select
  to authenticated
  using (
    pedido_id in (
      select id from prana_pedidos
      where cliente_id in (
        select id from prana_clientes where user_id = auth.uid()
      )
    )
  );

-- Clientes pueden insertar items en sus propios pedidos
create policy "pedido_items: cliente inserta"
  on prana_pedido_items for insert
  to authenticated
  with check (
    pedido_id in (
      select id from prana_pedidos
      where cliente_id in (
        select id from prana_clientes where user_id = auth.uid()
      )
    )
  );

-- Admins pueden leer todos los items
create policy "pedido_items: admin lee todos"
  on prana_pedido_items for select
  to authenticated
  using (is_admin());

-- Admins pueden insertar, actualizar y eliminar items (para editar pedidos)
create policy "pedido_items: admin inserta"
  on prana_pedido_items for insert
  to authenticated
  with check (is_admin());

create policy "pedido_items: admin actualiza"
  on prana_pedido_items for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "pedido_items: admin elimina"
  on prana_pedido_items for delete
  to authenticated
  using (is_admin());

-- ============================================
-- POLÍTICAS: prana_config
-- ============================================

-- La config es pública (se usa para mostrar datos bancarios y WhatsApp)
create policy "config: lectura publica"
  on prana_config for select
  to anon, authenticated
  using (true);

-- Solo admins pueden modificar la config
create policy "config: admin inserta"
  on prana_config for insert
  to authenticated
  with check (is_admin());

create policy "config: admin actualiza"
  on prana_config for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ============================================
-- DATOS INICIALES (correr solo la primera vez)
-- ============================================

-- Config por defecto (ignorar si ya existe)
insert into prana_config (clave, valor) values
  ('whatsapp_nati', '5492994000000'),
  ('datos_bancarios', 'Alias: MUNDO.PRANA' || chr(10) || 'CBU: 0000000000000000000000' || chr(10) || 'Titular: Mundo Prana'),
  ('mensaje_bienvenida', '¡Bienvenido/a a Mundo Prana! 🌿')
on conflict (clave) do nothing;

-- ============================================
-- TRIGGER: asignar rol 'cliente' automáticamente al registrarse
-- (por si la app falla al insertar en prana_roles manualmente)
-- ============================================

-- Primero eliminar triggers viejos que puedan causar conflicto
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_frozen_auth_user_created on auth.users;

-- Función del trigger
create or replace function handle_new_user_role()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into prana_roles (user_id, role)
  values (new.id, 'cliente')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Trigger que se ejecuta cuando se crea un usuario en auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user_role();
