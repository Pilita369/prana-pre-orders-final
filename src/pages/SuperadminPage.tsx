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
import { Pedido, Cliente } from '@/lib/types';
import { Plus, Pencil, Trash2, Users, Package, UtensilsCrossed, Settings, Truck, Minus, Loader2, History, Trophy, Star } from 'lucide-react';

const estadoLabel: Record<string, string> = {
  pendiente: 'Pendiente', en_preparacion: 'En preparación', listo: 'Listo', entregado: 'Entregado',
};

const estadoColor: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  en_preparacion: 'bg-blue-100 text-blue-800 border-blue-300',
  listo: 'bg-green-100 text-green-800 border-green-300',
  entregado: 'bg-muted text-muted-foreground',
};

const getPuntos = (clienteId: string, pedidos: Pedido[]) =>
  pedidos
    .filter(p => p.cliente_id === clienteId)
    .reduce((total, p) => total + p.items.reduce((s, i) => s + i.cantidad, 0), 0);

const getTier = (puntos: number) => {
  if (puntos >= 500) return { label: 'Oro', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
  if (puntos >= 250) return { label: 'Plata', color: 'bg-slate-100 text-slate-700 border-slate-300' };
  return null;
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

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
      supabase.from('prana_config').upsert({ clave: 'whatsapp_nati', valor: cfgForm.whatsapp_nati }, { onConflict: 'clave' }),
      supabase.from('prana_config').upsert({ clave: 'datos_bancarios', valor: cfgForm.datos_bancarios }, { onConflict: 'clave' }),
      supabase.from('prana_config').upsert({ clave: 'mensaje_bienvenida', valor: cfgForm.mensaje_bienvenida }, { onConflict: 'clave' }),
      supabase.from('prana_config').upsert({ clave: 'beneficio_250', valor: cfgForm.beneficio_250 }, { onConflict: 'clave' }),
      supabase.from('prana_config').upsert({ clave: 'beneficio_500', valor: cfgForm.beneficio_500 }, { onConflict: 'clave' }),
    ]);
    setConfig(cfgForm);
    toast({ title: 'Configuración guardada ✅' });
    setSavingCfg(false);
  };

  // Borrar pedido
  const deletePedido = async (id: string) => {
    await supabase.from('prana_pedidos').delete().eq('id', id);
    await refetchPedidos();
    setConfirmDeleteId(null);
    toast({ title: 'Pedido eliminado' });
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
    toast({ title: 'Pedido actualizado ✅' });
    setSaving(false);
    setPedidoEditando(null);
  };

  // Clientes únicos
  const clientes = Array.from(new Map(
    pedidos.filter(p => p.cliente).map(p => [p.cliente!.id, p.cliente!])
  ).values());

  // Pedidos activos vs historial
  const pedidosActivos = pedidos.filter(p => p.estado !== 'entregado');
  const pedidosHistorial = pedidos.filter(p => p.estado === 'entregado');

  // Ranking
  const ranking = clientes
    .map(c => ({
      cliente: c,
      puntos: getPuntos(c.id, pedidos),
      totalPedidos: pedidos.filter(p => p.cliente_id === c.id).length,
    }))
    .sort((a, b) => b.puntos - a.puntos);

  const PedidoCard = ({ p, showDelete = true }: { p: Pedido; showDelete?: boolean }) => (
    <Card key={p.id}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{p.cliente?.nombre} {p.cliente?.apellido}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(p.fecha_pedido).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })} • {p.metodo_pago} • <span className="font-semibold text-accent">${p.total.toLocaleString('es-AR')}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className={`text-xs ${estadoColor[p.estado]}`}>{estadoLabel[p.estado]}</Badge>
            {showDelete && (
              confirmDeleteId === p.id ? (
                <div className="flex gap-1">
                  <Button variant="destructive" size="sm" className="h-7 text-xs px-2" onClick={() => deletePedido(p.id)}>Confirmar</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setConfirmDeleteId(null)}>No</Button>
                </div>
              ) : (
                <>
                  <Select value={p.estado} onValueChange={v => cambiarEstado(p.id, v)}>
                    <SelectTrigger className="w-[130px] h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(estadoLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => abrirEditor(p)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setConfirmDeleteId(p.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )
            )}
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
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="font-display text-3xl font-bold mb-6">Panel Superadmin 🌿</h1>

      <Tabs defaultValue="pedidos">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="pedidos" className="gap-1"><Package className="h-4 w-4" /> Pedidos</TabsTrigger>
          <TabsTrigger value="historial" className="gap-1"><History className="h-4 w-4" /> Historial</TabsTrigger>
          <TabsTrigger value="ranking" className="gap-1"><Trophy className="h-4 w-4" /> Ranking</TabsTrigger>
          <TabsTrigger value="menu" className="gap-1"><UtensilsCrossed className="h-4 w-4" /> Menú</TabsTrigger>
          <TabsTrigger value="clientes" className="gap-1"><Users className="h-4 w-4" /> Clientes</TabsTrigger>
          <TabsTrigger value="config" className="gap-1"><Settings className="h-4 w-4" /> Config</TabsTrigger>
        </TabsList>

        {/* PEDIDOS ACTIVOS */}
        <TabsContent value="pedidos">
          <div className="space-y-4">
            {pedidosActivos.length === 0
              ? <p className="text-muted-foreground text-center py-8">No hay pedidos activos</p>
              : pedidosActivos.map(p => <PedidoCard key={p.id} p={p} />)
            }
          </div>
        </TabsContent>

        {/* HISTORIAL */}
        <TabsContent value="historial">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{pedidosHistorial.length} pedido{pedidosHistorial.length !== 1 ? 's' : ''} entregado{pedidosHistorial.length !== 1 ? 's' : ''}</p>
            <p className="text-sm font-semibold text-accent">
              Total: ${pedidosHistorial.reduce((s, p) => s + p.total, 0).toLocaleString('es-AR')}
            </p>
          </div>
          <div className="space-y-4">
            {pedidosHistorial.length === 0
              ? <p className="text-muted-foreground text-center py-8">Todavía no hay pedidos entregados</p>
              : pedidosHistorial.map(p => <PedidoCard key={p.id} p={p} />)
            }
          </div>
        </TabsContent>

        {/* RANKING */}
        <TabsContent value="ranking">
          <div className="mb-4 p-4 bg-secondary rounded-lg text-sm space-y-1">
            <p className="font-semibold mb-2">Sistema de puntos</p>
            <p>1 vianda = 1 punto</p>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-slate-500" />
              <span><strong>250 puntos (Plata):</strong> {config.beneficio_250 || 'Sin definir'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span><strong>500 puntos (Oro):</strong> {config.beneficio_500 || 'Sin definir'}</span>
            </div>
          </div>

          <div className="space-y-3">
            {ranking.length === 0
              ? <p className="text-muted-foreground text-center py-8">No hay clientes aún</p>
              : ranking.map((r, idx) => {
                  const tier = getTier(r.puntos);
                  const progreso = r.puntos >= 500 ? 100 : r.puntos >= 250 ? ((r.puntos - 250) / 250) * 100 : (r.puntos / 250) * 100;
                  const siguiente = r.puntos >= 500 ? null : r.puntos >= 250 ? 500 : 250;

                  return (
                    <Card key={r.cliente.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-bold text-muted-foreground w-8 text-center">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">{r.cliente.nombre} {r.cliente.apellido}</p>
                              {tier && <Badge variant="outline" className={tier.color}>{tier.label}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{r.cliente.email} • {r.totalPedidos} pedido{r.totalPedidos !== 1 ? 's' : ''}</p>
                            <div className="mt-2">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-semibold text-primary">{r.puntos} puntos</span>
                                {siguiente && <span className="text-muted-foreground">Faltan {siguiente - r.puntos} para {siguiente === 250 ? 'Plata' : 'Oro'}</span>}
                                {!siguiente && <span className="text-yellow-600 font-semibold">Nivel máximo</span>}
                              </div>
                              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${r.puntos >= 500 ? 'bg-yellow-400' : r.puntos >= 250 ? 'bg-slate-400' : 'bg-primary'}`}
                                  style={{ width: `${Math.min(progreso, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
            }
          </div>
        </TabsContent>

        {/* MENÚ */}
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

        {/* CLIENTES */}
        <TabsContent value="clientes">
          <div className="space-y-3">
            {clientes.length === 0
              ? <p className="text-muted-foreground text-center py-8">No hay clientes aún</p>
              : clientes.map(c => {
                  const puntos = getPuntos(c.id, pedidos);
                  const tier = getTier(puntos);
                  const totalPedidos = pedidos.filter(p => p.cliente_id === c.id).length;
                  return (
                    <Card key={c.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">{c.nombre} {c.apellido}</p>
                              {tier && <Badge variant="outline" className={tier.color}>{tier.label}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{c.email} • {c.telefono || 'Sin teléfono'}</p>
                            {c.direccion_default && <p className="text-sm text-muted-foreground">📍 {c.direccion_default}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-primary">{puntos} pts</p>
                            <p className="text-xs text-muted-foreground">{totalPedidos} pedido{totalPedidos !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
            }
          </div>
        </TabsContent>

        {/* CONFIG */}
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
              <div className="border-t pt-4">
                <p className="font-semibold mb-3 flex items-center gap-2"><Star className="h-4 w-4 text-slate-500" /> Beneficio Plata (250 puntos)</p>
                <Textarea
                  value={cfgForm.beneficio_250}
                  onChange={e => setCfgForm(p => ({ ...p, beneficio_250: e.target.value }))}
                  placeholder="Ej: Descuento 10% en tu próximo pedido"
                  rows={2}
                />
              </div>
              <div>
                <p className="font-semibold mb-3 flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" /> Beneficio Oro (500 puntos)</p>
                <Textarea
                  value={cfgForm.beneficio_500}
                  onChange={e => setCfgForm(p => ({ ...p, beneficio_500: e.target.value }))}
                  placeholder="Ej: Vianda gratis a elección"
                  rows={2}
                />
              </div>
              <Button onClick={saveConfig} disabled={savingCfg}>
                {savingCfg ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar configuración'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG EDITAR PEDIDO */}
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
