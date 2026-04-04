import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
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
import { Pedido } from '@/lib/types';
import { Plus, Pencil, Trash2, Users, Package, UtensilsCrossed, Settings, Truck, Minus, Loader2 } from 'lucide-react';

const estadoLabel: Record<string, string> = {
  pendiente: 'Pendiente', en_preparacion: 'En preparación', listo: 'Listo', entregado: 'Entregado',
};

const SuperadminPage = () => {
  const { pedidos, menuItems, setMenuItems, config, setConfig, refetchPedidos } = useApp();
  const { toast } = useToast();

  const [newItem, setNewItem] = useState({ nombre: '', descripcion: '', precio: 12000 });
  const [cfgForm, setCfgForm] = useState(config);
  const [savingCfg, setSavingCfg] = useState(false);

  const [pedidoEditando, setPedidoEditando] = useState<Pedido | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [necesitaEnvio, setNecesitaEnvio] = useState(false);
  const [direccion, setDireccion] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [estadoEdit, setEstadoEdit] = useState('pendiente');
  const [saving, setSaving] = useState(false);

  // Menú
  const addItem = async () => {
    if (!newItem.nombre.trim()) return;
    const { data } = await supabase.from('prana_menu').insert({
      ...newItem, activo: true, orden: menuItems.length + 1,
    }).select().single();
    if (data) setMenuItems(prev => [...prev, data]);
    setNewItem({ nombre: '', descripcion: '', precio: 12000 });
    toast({ title: 'Item agregado ✅' });
  };

  const deleteItem = async (id: string) => {
    await supabase.from('prana_menu').delete().eq('id', id);
    setMenuItems(prev => prev.filter(i => i.id !== id));
    toast({ title: 'Item eliminado' });
  };

  const toggleItem = async (id: string, activo: boolean) => {
    await supabase.from('prana_menu').update({ activo: !activo }).eq('id', id);
    setMenuItems(prev => prev.map(i => i.id === id ? { ...i, activo: !activo } : i));
  };

  // Config
  const saveConfig = async () => {
    setSavingCfg(true);
    await Promise.all([
      supabase.from('prana_config').update({ valor: cfgForm.whatsapp_nati }).eq('clave', 'whatsapp_nati'),
      supabase.from('prana_config').update({ valor: cfgForm.datos_bancarios }).eq('clave', 'datos_bancarios'),
      supabase.from('prana_config').update({ valor: cfgForm.mensaje_bienvenida }).eq('clave', 'mensaje_bienvenida'),
    ]);
    setConfig(cfgForm);
    toast({ title: 'Configuración guardada ✅' });
    setSavingCfg(false);
  };

  // Editor pedido
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
    setCantidades(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));
  };

  const totalItems = Object.values(cantidades).reduce((s, v) => s + v, 0);
  const totalCalc = Object.entries(cantidades).reduce((s, [id, qty]) => {
    const item = menuItems.find(i => i.id === id);
    return s + (item ? item.precio * qty : 0);
  }, 0);

  const cambiarEstado = async (id: string, estado: string) => {
    await supabase.from('prana_pedidos').update({ estado }).eq('id', id);
    await refetchPedidos();
    toast({ title: `Estado: ${estadoLabel[estado]}` });
  };

  const guardarEdicion = async () => {
    if (!pedidoEditando || totalItems === 0) return;
    setSaving(true);
    await supabase.from('prana_pedidos').update({
      total: totalCalc, metodo_pago: metodoPago,
      necesita_envio: necesitaEnvio,
      direccion_envio: necesitaEnvio ? direccion : null,
      comentarios: comentarios || null, estado: estadoEdit,
    }).eq('id', pedidoEditando.id);
    await supabase.from('prana_pedido_items').delete().eq('pedido_id', pedidoEditando.id);
    const nuevosItems = Object.entries(cantidades).filter(([, q]) => q > 0).map(([id, q]) => ({
      pedido_id: pedidoEditando.id, menu_item_id: id, cantidad: q,
      precio_unitario: menuItems.find(i => i.id === id)!.precio,
    }));
    await supabase.from('prana_pedido_items').insert(nuevosItems);
    await refetchPedidos();
    toast({ title: '✏️ Pedido actualizado' });
    setSaving(false);
    setPedidoEditando(null);
  };

  // Clientes únicos de pedidos
  const clientes = Array.from(new Map(
    pedidos.filter(p => p.cliente).map(p => [p.cliente!.id, p.cliente!])
  ).values());

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

        <TabsContent value="pedidos">
          <div className="space-y-4">
            {pedidos.length === 0
              ? <p className="text-muted-foreground text-center py-8">No hay pedidos</p>
              : pedidos.map(p => (
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
              ))
            }
          </div>
        </TabsContent>

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
                    <Switch checked={item.activo} onCheckedChange={() => toggleItem(item.id, item.activo)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="clientes">
          <div className="space-y-3">
            {clientes.length === 0
              ? <p className="text-muted-foreground text-center py-8">No hay clientes aún</p>
              : clientes.map(c => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <p className="font-semibold">{c.nombre} {c.apellido}</p>
                    <p className="text-sm text-muted-foreground">{c.email} • {c.telefono || 'Sin teléfono'}</p>
                    {c.direccion_default && <p className="text-sm text-muted-foreground">📍 {c.direccion_default}</p>}
                  </CardContent>
                </Card>
              ))
            }
          </div>
        </TabsContent>

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
              <Button onClick={saveConfig} disabled={savingCfg}>
                {savingCfg ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar configuración'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!pedidoEditando} onOpenChange={open => !open && setPedidoEditando(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Editar — {pedidoEditando?.cliente?.nombre} {pedidoEditando?.cliente?.apellido}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-semibold">Estado</Label>
              <Select value={estadoEdit} onValueChange={setEstadoEdit}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(estadoLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-sm">Viandas</p>
              {menuItems.map(item => {
                const qty = cantidades[item.id] || 0;
                return (
                  <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${qty > 0 ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium">{item.nombre}</p>
                      <p className="text-xs text-accent font-semibold">${item.precio.toLocaleString('es-AR')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCant(item.id, -1)} disabled={qty === 0}><Minus className="h-3 w-3" /></Button>
                      <span className="w-6 text-center font-bold text-sm">{qty}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCant(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <Label className="font-semibold">Método de pago</Label>
              <RadioGroup value={metodoPago} onValueChange={v => setMetodoPago(v as any)} className="flex gap-4 mt-2">
                <div className="flex items-center gap-2"><RadioGroupItem value="efectivo" id="sa-ef" /><Label htmlFor="sa-ef">Efectivo</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="transferencia" id="sa-tr" /><Label htmlFor="sa-tr">Transferencia</Label></div>
              </RadioGroup>
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-semibold">¿Necesita envío?</Label>
              <Switch checked={necesitaEnvio} onCheckedChange={setNecesitaEnvio} />
            </div>
            {necesitaEnvio && <div><Label>Dirección</Label><Input value={direccion} onChange={e => setDireccion(e.target.value)} /></div>}
            <div><Label>Comentarios</Label><Textarea value={comentarios} onChange={e => setComentarios(e.target.value)} /></div>
            {totalItems > 0 && (
              <div className="flex justify-between items-center bg-secondary rounded-lg px-4 py-3">
                <span className="text-sm text-muted-foreground">{totalItems} vianda{totalItems > 1 ? 's' : ''}</span>
                <span className="font-bold text-xl text-accent">${totalCalc.toLocaleString('es-AR')}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setPedidoEditando(null)}>Cancelar</Button>
            <Button onClick={guardarEdicion} disabled={saving || totalItems === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperadminPage;
