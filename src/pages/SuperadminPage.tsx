import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { MenuItem, Pedido } from '@/lib/types';
import { Plus, Pencil, Trash2, Users, Package, UtensilsCrossed, Settings, Truck, Minus } from 'lucide-react';

const estadoLabel: Record<string, string> = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
};

const estadoColor: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  en_preparacion: 'bg-blue-100 text-blue-800 border-blue-300',
  listo: 'bg-green-100 text-green-800 border-green-300',
  entregado: 'bg-muted text-muted-foreground',
};

const SuperadminPage = () => {
  const { auth, pedidos, setPedidos, config, setConfig, menuItems, setMenuItems, clientes } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form nuevo item de menú
  const [newItem, setNewItem] = useState({ nombre: '', descripcion: '', precio: 12000 });
  // Form config
  const [cfgForm, setCfgForm] = useState(config);

  // Editor de pedido
  const [pedidoEditando, setPedidoEditando] = useState<Pedido | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [necesitaEnvio, setNecesitaEnvio] = useState(false);
  const [direccion, setDireccion] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [estadoEdit, setEstadoEdit] = useState('pendiente');

  if (!auth.isLoggedIn || auth.role !== 'superadmin') { navigate('/login'); return null; }

  const itemsActivos = menuItems.filter(i => i.activo);

  // --- Menú ---
  const addItem = () => {
    if (!newItem.nombre.trim()) return;
    const item: MenuItem = { id: `m${Date.now()}`, ...newItem, activo: true, orden: menuItems.length + 1 };
    setMenuItems(prev => [...prev, item]);
    setNewItem({ nombre: '', descripcion: '', precio: 12000 });
    toast({ title: 'Item agregado ✅' });
  };

  const deleteItem = (id: string) => {
    setMenuItems(prev => prev.filter(i => i.id !== id));
    toast({ title: 'Item eliminado' });
  };

  const toggleItem = (id: string) => {
    setMenuItems(prev => prev.map(i => i.id === id ? { ...i, activo: !i.activo } : i));
  };

  // --- Config ---
  const saveConfig = () => {
    setConfig(cfgForm);
    toast({ title: 'Configuración guardada ✅' });
  };

  // --- Editor pedido ---
  const abrirEditor = (p: Pedido) => {
    const cants: Record<string, number> = {};
    p.items.forEach(i => { cants[i.menu_item_id] = i.cantidad; });
    setCantidades(cants);
    setMetodoPago(p.metodo_pago);
    setNecesitaEnvio(p.necesita_envio);
    setDireccion(p.direccion_envio || '');
    setComentarios(p.comentarios || '');
    setEstadoEdit(p.estado);
    setPedidoEditando(p);
  };

  const setCant = (id: string, delta: number) => {
    setCantidades(prev => {
      const v = Math.max(0, (prev[id] || 0) + delta);
      return { ...prev, [id]: v };
    });
  };

  const totalItems = Object.values(cantidades).reduce((s, v) => s + v, 0);
  const totalCalc = Object.entries(cantidades).reduce((s, [id, qty]) => {
    const item = menuItems.find(i => i.id === id);
    return s + (item ? item.precio * qty : 0);
  }, 0);

  const guardarEdicion = () => {
    if (!pedidoEditando) return;
    if (totalItems === 0) { toast({ title: 'Agregá al menos una vianda', variant: 'destructive' }); return; }
    if (necesitaEnvio && !direccion.trim()) { toast({ title: 'Ingresá la dirección', variant: 'destructive' }); return; }

    const nuevosItems = Object.entries(cantidades)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({
        id: `pi${Date.now()}${id}`,
        pedido_id: pedidoEditando.id,
        menu_item_id: id,
        cantidad: q,
        precio_unitario: menuItems.find(i => i.id === id)!.precio,
        menu_item: menuItems.find(i => i.id === id),
      }));

    setPedidos(prev => prev.map(p =>
      p.id === pedidoEditando.id
        ? {
            ...p,
            items: nuevosItems,
            total: totalCalc,
            metodo_pago: metodoPago,
            necesita_envio: necesitaEnvio,
            direccion_envio: necesitaEnvio ? direccion : undefined,
            comentarios: comentarios || undefined,
            estado: estadoEdit as any,
          }
        : p
    ));
    toast({ title: '✏️ Pedido actualizado' });
    setPedidoEditando(null);
  };

  const cambiarEstado = (id: string, estado: string) => {
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado: estado as any } : p));
    toast({ title: `Estado: ${estadoLabel[estado]}` });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="font-display text-3xl font-bold mb-6">Panel Superadmin 🌿</h1>

      <Tabs defaultValue="pedidos">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="pedidos" className="gap-1"><Package className="h-4 w-4" /> Pedidos</TabsTrigger>
          <TabsTrigger value="menu" className="gap-1"><UtensilsCrossed className="h-4 w-4" /> Menú</TabsTrigger>
          <TabsTrigger value="clientes" className="gap-1"><Users className="h-4 w-4" /> Clientes</TabsTrigger>
          <TabsTrigger value="config" className="gap-1"><Settings className="h-4 w-4" /> Config</TabsTrigger>
        </TabsList>

        {/* Pedidos */}
        <TabsContent value="pedidos">
          <div className="space-y-4">
            {pedidos.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay pedidos</p>
            ) : pedidos.map(p => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{p.cliente?.nombre} {p.cliente?.apellido}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.fecha_pedido).toLocaleDateString('es-AR')} • {p.metodo_pago} • <span className="font-semibold text-accent">${p.total.toLocaleString('es-AR')}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Select value={p.estado} onValueChange={v => cambiarEstado(p.id, v)}>
                        <SelectTrigger className="w-[145px] h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(estadoLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => abrirEditor(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    {p.items.map(i => {
                      const mi = i.menu_item || menuItems.find(m => m.id === i.menu_item_id);
                      return <p key={i.id} className="text-muted-foreground">{i.cantidad}x {mi?.nombre}</p>;
                    })}
                  </div>
                  {p.necesita_envio && <Badge variant="outline" className="mt-2 gap-1"><Truck className="h-3 w-3" /> {p.direccion_envio}</Badge>}
                  {p.comentarios && <p className="text-sm italic text-muted-foreground mt-1">"{p.comentarios}"</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Menú */}
        <TabsContent value="menu">
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-lg">Agregar item</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Nombre del plato" value={newItem.nombre} onChange={e => setNewItem(p => ({ ...p, nombre: e.target.value }))} />
              <Textarea placeholder="Descripción" value={newItem.descripcion} onChange={e => setNewItem(p => ({ ...p, descripcion: e.target.value }))} />
              <Input type="number" placeholder="Precio" value={newItem.precio} onChange={e => setNewItem(p => ({ ...p, precio: Number(e.target.value) }))} />
              <Button onClick={addItem} className="gap-1"><Plus className="h-4 w-4" /> Agregar</Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {menuItems.map(item => (
              <Card key={item.id} className={!item.activo ? 'opacity-50' : ''}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{item.nombre}</p>
                    <p className="text-xs text-muted-foreground">{item.descripcion}</p>
                    <p className="text-sm font-bold text-accent">${item.precio.toLocaleString('es-AR')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={item.activo} onCheckedChange={() => toggleItem(item.id)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Clientes */}
        <TabsContent value="clientes">
          <div className="space-y-3">
            {clientes.map(c => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <p className="font-semibold">{c.nombre} {c.apellido}</p>
                  <p className="text-sm text-muted-foreground">{c.email} • {c.telefono || 'Sin teléfono'}</p>
                  {c.direccion_default && <p className="text-sm text-muted-foreground">📍 {c.direccion_default}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Config */}
        <TabsContent value="config">
          <Card>
            <CardHeader><CardTitle>Configuración general</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>WhatsApp de Nati (con código país, sin +)</Label>
                <Input value={cfgForm.whatsapp_nati} onChange={e => setCfgForm(p => ({ ...p, whatsapp_nati: e.target.value }))} placeholder="5492991234567" />
              </div>
              <div>
                <Label>Datos bancarios para transferencia</Label>
                <Textarea value={cfgForm.datos_bancarios} onChange={e => setCfgForm(p => ({ ...p, datos_bancarios: e.target.value }))} rows={4} />
              </div>
              <div>
                <Label>Mensaje de bienvenida</Label>
                <Textarea value={cfgForm.mensaje_bienvenida} onChange={e => setCfgForm(p => ({ ...p, mensaje_bienvenida: e.target.value }))} />
              </div>
              <Button onClick={saveConfig}>Guardar configuración</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal editor de pedido */}
      <Dialog open={!!pedidoEditando} onOpenChange={open => !open && setPedidoEditando(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Editar pedido — {pedidoEditando?.cliente?.nombre} {pedidoEditando?.cliente?.apellido}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Estado */}
            <div>
              <Label className="font-semibold">Estado</Label>
              <Select value={estadoEdit} onValueChange={setEstadoEdit}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(estadoLabel).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Viandas */}
            <div className="space-y-2">
              <p className="font-semibold text-sm">Viandas</p>
              {menuItems.map(item => {
                const qty = cantidades[item.id] || 0;
                return (
                  <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${qty > 0 ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium leading-snug">{item.nombre}</p>
                      <p className="text-xs text-accent font-semibold">${item.precio.toLocaleString('es-AR')}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCant(item.id, -1)} disabled={qty === 0}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center font-bold text-sm">{qty}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCant(item.id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pago */}
            <div>
              <Label className="font-semibold">Método de pago</Label>
              <RadioGroup value={metodoPago} onValueChange={v => setMetodoPago(v as any)} className="flex gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="efectivo" id="sa-efectivo" />
                  <Label htmlFor="sa-efectivo">Efectivo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="transferencia" id="sa-transferencia" />
                  <Label htmlFor="sa-transferencia">Transferencia</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Envío */}
            <div className="flex items-center justify-between">
              <Label className="font-semibold">¿Necesita envío?</Label>
              <Switch checked={necesitaEnvio} onCheckedChange={setNecesitaEnvio} />
            </div>
            {necesitaEnvio && (
              <div>
                <Label>Dirección</Label>
                <Input value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Dirección completa" />
              </div>
            )}

            {/* Comentarios */}
            <div>
              <Label>Comentarios</Label>
              <Textarea value={comentarios} onChange={e => setComentarios(e.target.value)} placeholder="Observaciones" />
            </div>

            {totalItems > 0 && (
              <div className="flex justify-between items-center bg-secondary rounded-lg px-4 py-3">
                <span className="text-sm text-muted-foreground">{totalItems} vianda{totalItems > 1 ? 's' : ''}</span>
                <span className="font-bold text-xl text-accent">${totalCalc.toLocaleString('es-AR')}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setPedidoEditando(null)}>Cancelar</Button>
            <Button onClick={guardarEdicion} disabled={totalItems === 0}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperadminPage;
