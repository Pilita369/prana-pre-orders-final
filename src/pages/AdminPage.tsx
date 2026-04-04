import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Package, Settings, Pencil, Minus, Plus, Loader2, Trophy, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Pedido } from '@/lib/types';

const estadoLabel: Record<string, string> = {
  pendiente: 'Pendiente', en_preparacion: 'En preparación', listo: 'Listo', entregado: 'Entregado',
};

const AdminPage = () => {
  const { pedidos, menuItems, config, setConfig, refetchPedidos } = useApp();
  const { toast } = useToast();
  const [whatsapp, setWhatsapp] = useState(config.whatsapp_nati);
  const [savingWsp, setSavingWsp] = useState(false);

  const [pedidoEditando, setPedidoEditando] = useState<Pedido | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [necesitaEnvio, setNecesitaEnvio] = useState(false);
  const [direccion, setDireccion] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [estadoEdit, setEstadoEdit] = useState('pendiente');
  const [saving, setSaving] = useState(false);

  const hoy = new Date().toDateString();
  const pedidosHoy = pedidos.filter(p => new Date(p.fecha_pedido).toDateString() === hoy);
  const repartos = pedidos.filter(p => p.necesita_envio && p.estado !== 'entregado');
  const itemsActivos = menuItems.filter(i => i.activo);

  const getPuntos = (clienteId: string) =>
    pedidos.filter(p => p.cliente_id === clienteId)
      .reduce((t, p) => t + p.items.reduce((s, i) => s + i.cantidad, 0), 0);

  const getTier = (puntos: number) => {
    if (puntos >= 500) return { label: 'Oro', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    if (puntos >= 250) return { label: 'Plata', color: 'bg-slate-100 text-slate-700 border-slate-300' };
    return null;
  };

  const clientes = Array.from(new Map(
    pedidos.filter(p => p.cliente).map(p => [p.cliente!.id, p.cliente!])
  ).values());

  const ranking = clientes
    .map(c => ({ cliente: c, puntos: getPuntos(c.id), totalPedidos: pedidos.filter(p => p.cliente_id === c.id).length }))
    .sort((a, b) => b.puntos - a.puntos);

  const cambiarEstado = async (id: string, estado: string) => {
    await supabase.from('prana_pedidos').update({ estado }).eq('id', id);
    await refetchPedidos();
    toast({ title: `Pedido: ${estadoLabel[estado]}` });
  };

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
    const item = itemsActivos.find(i => i.id === id);
    return s + (item ? item.precio * qty : 0);
  }, 0);

  const guardarEdicion = async () => {
    if (!pedidoEditando || totalItems === 0) return;
    setSaving(true);

    await supabase.from('prana_pedidos').update({
      total: totalCalc,
      metodo_pago: metodoPago,
      necesita_envio: necesitaEnvio,
      direccion_envio: necesitaEnvio ? direccion : null,
      comentarios: comentarios || null,
      estado: estadoEdit,
    }).eq('id', pedidoEditando.id);

    await supabase.from('prana_pedido_items').delete().eq('pedido_id', pedidoEditando.id);

    const nuevosItems = Object.entries(cantidades)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({
        pedido_id: pedidoEditando.id,
        menu_item_id: id,
        cantidad: q,
        precio_unitario: itemsActivos.find(i => i.id === id)!.precio,
      }));

    await supabase.from('prana_pedido_items').insert(nuevosItems);
    await refetchPedidos();
    toast({ title: '✏️ Pedido actualizado' });
    setSaving(false);
    setPedidoEditando(null);
  };

  const guardarWhatsapp = async () => {
    setSavingWsp(true);
    await supabase.from('prana_config').update({ valor: whatsapp }).eq('clave', 'whatsapp_nati');
    setConfig(prev => ({ ...prev, whatsapp_nati: whatsapp }));
    toast({ title: 'WhatsApp actualizado ✅' });
    setSavingWsp(false);
  };

  const TarjetaPedido = ({ p }: { p: Pedido }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{p.cliente?.nombre} {p.cliente?.apellido}</p>
            <p className="text-sm text-muted-foreground">{p.metodo_pago} • <span className="font-semibold text-accent">${p.total.toLocaleString('es-AR')}</span></p>
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
        <div className="space-y-1 text-sm">
          {p.items.map(i => {
            const mi = i.menu_item || menuItems.find(m => m.id === i.menu_item_id);
            return <p key={i.id} className="text-muted-foreground">{i.cantidad}x {mi?.nombre}</p>;
          })}
        </div>
        {p.comentarios && <p className="text-sm text-muted-foreground mt-2 italic">"{p.comentarios}"</p>}
        {p.necesita_envio && <Badge variant="outline" className="mt-2 gap-1"><Truck className="h-3 w-3" /> {p.direccion_envio}</Badge>}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="font-display text-3xl font-bold mb-6">Panel de Nati 🌿</h1>
      <Tabs defaultValue="pedidos">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="pedidos" className="gap-1"><Package className="h-4 w-4" /> Pedidos del día</TabsTrigger>
          <TabsTrigger value="repartos" className="gap-1"><Truck className="h-4 w-4" /> Repartos</TabsTrigger>
          <TabsTrigger value="ranking" className="gap-1"><Trophy className="h-4 w-4" /> Ranking</TabsTrigger>
          <TabsTrigger value="config" className="gap-1"><Settings className="h-4 w-4" /> Config</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos">
          {pedidosHoy.length === 0
            ? <p className="text-muted-foreground py-8 text-center">No hay pedidos hoy</p>
            : <div className="space-y-4">{pedidosHoy.map(p => <TarjetaPedido key={p.id} p={p} />)}</div>
          }
        </TabsContent>

        <TabsContent value="repartos">
          {repartos.length === 0
            ? <p className="text-muted-foreground py-8 text-center">No hay repartos pendientes</p>
            : <div className="space-y-3">{repartos.map(p => (
                <Card key={p.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{p.cliente?.nombre} {p.cliente?.apellido}</p>
                      <p className="text-sm text-muted-foreground">📍 {p.direccion_envio}</p>
                      {p.cliente?.telefono && <p className="text-sm text-muted-foreground">📞 {p.cliente.telefono}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{estadoLabel[p.estado]}</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => abrirEditor(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}</div>
          }
        </TabsContent>

        <TabsContent value="ranking">
          <div className="mb-4 p-4 bg-secondary rounded-lg text-sm space-y-1">
            <p className="font-semibold mb-1">Sistema de puntos — 1 vianda = 1 punto</p>
            <div className="flex items-center gap-2"><Star className="h-4 w-4 text-slate-500" /><span><strong>Plata (250 pts):</strong> {config.beneficio_250 || 'Sin definir'}</span></div>
            <div className="flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" /><span><strong>Oro (500 pts):</strong> {config.beneficio_500 || 'Sin definir'}</span></div>
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
                            <p className="text-xs text-muted-foreground">{r.totalPedidos} pedido{r.totalPedidos !== 1 ? 's' : ''}</p>
                            <div className="mt-2">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-semibold text-primary">{r.puntos} puntos</span>
                                {siguiente && <span className="text-muted-foreground">Faltan {siguiente - r.puntos} para {siguiente === 250 ? 'Plata' : 'Oro'}</span>}
                              </div>
                              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${r.puntos >= 500 ? 'bg-yellow-400' : r.puntos >= 250 ? 'bg-slate-400' : 'bg-primary'}`} style={{ width: `${Math.min(progreso, 100)}%` }} />
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

        <TabsContent value="config">
          <Card>
            <CardHeader><CardTitle>Mi número de WhatsApp</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Número (con código país, sin +)</Label>
                <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="5492991234567" />
                <p className="text-xs text-muted-foreground mt-1">Ejemplo Neuquén: 5492991234567</p>
              </div>
              <Button onClick={guardarWhatsapp} disabled={savingWsp}>
                {savingWsp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
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
              {itemsActivos.map(item => {
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
                <div className="flex items-center gap-2"><RadioGroupItem value="efectivo" id="ad-ef" /><Label htmlFor="ad-ef">Efectivo</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="transferencia" id="ad-tr" /><Label htmlFor="ad-tr">Transferencia</Label></div>
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

export default AdminPage;
