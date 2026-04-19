import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pencil, Minus, Plus, Loader2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Pedido } from '@/lib/types';

const estadoColor: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  en_preparacion: 'bg-blue-100 text-blue-800 border-blue-300',
  listo: 'bg-green-100 text-green-800 border-green-300',
  entregado: 'bg-muted text-muted-foreground',
};

const estadoLabel: Record<string, string> = {
  pendiente: 'Pendiente', en_preparacion: 'En preparación', listo: 'Listo', entregado: 'Entregado',
};

const HistorialPage = () => {
  const { pedidos, menuItems, config, refetchPedidos } = useApp();
  const { cliente } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pedidoEditando, setPedidoEditando] = useState<Pedido | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [necesitaEnvio, setNecesitaEnvio] = useState(false);
  const [direccion, setDireccion] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [saving, setSaving] = useState(false);

  const misPedidos = pedidos.filter(p => p.cliente_id === cliente?.id);
  const itemsActivos = menuItems.filter(i => i.activo);

  // Puntos: 1 por vianda
  const puntos = misPedidos.reduce((total, p) =>
    total + p.items.reduce((s, i) => s + i.cantidad, 0), 0
  );
  const siguiente = puntos >= 500 ? null : puntos >= 250 ? 500 : 250;
  const progreso = puntos >= 500 ? 100 : puntos >= 250
    ? ((puntos - 250) / 250) * 100
    : (puntos / 250) * 100;
  const tier = puntos >= 500 ? 'Oro' : puntos >= 250 ? 'Plata' : null;

  const abrirEditor = (p: Pedido) => {
    const cants: Record<string, number> = {};
    p.items.forEach(i => { cants[i.menu_item_id] = i.cantidad; });
    setCantidades(cants);
    setMetodoPago(p.metodo_pago);
    setNecesitaEnvio(p.necesita_envio);
    setDireccion(p.direccion_envio || '');
    setComentarios(p.comentarios || '');
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
    if (necesitaEnvio && !direccion.trim()) {
      toast({ title: 'Ingresá la dirección de envío', variant: 'destructive' });
      return;
    }
    setSaving(true);
    await supabase.from('prana_pedidos').update({
      total: totalCalc, metodo_pago: metodoPago,
      necesita_envio: necesitaEnvio,
      direccion_envio: necesitaEnvio ? direccion : null,
      comentarios: comentarios || null,
    }).eq('id', pedidoEditando.id);
    await supabase.from('prana_pedido_items').delete().eq('pedido_id', pedidoEditando.id);
    const nuevosItems = Object.entries(cantidades)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({
        pedido_id: pedidoEditando.id, menu_item_id: id, cantidad: q,
        precio_unitario: itemsActivos.find(i => i.id === id)!.precio,
      }));
    await supabase.from('prana_pedido_items').insert(nuevosItems);
    await refetchPedidos();
    toast({ title: 'Pedido actualizado ✅' });
    setSaving(false);
    setPedidoEditando(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="font-display text-3xl font-bold mb-6 text-center">Mis pedidos</h1>

      {/* Tarjeta de puntos */}
      {misPedidos.length > 0 && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Star className={`h-5 w-5 ${tier === 'Oro' ? 'text-yellow-500' : tier === 'Plata' ? 'text-slate-500' : 'text-primary'}`} />
                <span className="font-bold text-lg">{puntos} puntos</span>
                {tier && <Badge variant="outline" className={tier === 'Oro' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-slate-100 text-slate-700 border-slate-300'}>{tier}</Badge>}
              </div>
              {siguiente && (
                <span className="text-xs text-muted-foreground">Faltan {siguiente - puntos} para {siguiente === 250 ? 'Plata' : 'Oro'}</span>
              )}
              {!siguiente && <span className="text-xs text-yellow-600 font-semibold">Nivel máximo</span>}
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all ${tier === 'Oro' ? 'bg-yellow-400' : tier === 'Plata' ? 'bg-slate-400' : 'bg-primary'}`}
                style={{ width: `${Math.min(progreso, 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              {puntos < 250 && config.beneficio_250 && (
                <p><span className="font-semibold text-slate-600">Plata (250 pts):</span> {config.beneficio_250}</p>
              )}
              {puntos >= 250 && config.beneficio_250 && (
                <p className="text-slate-600 line-through"><span className="font-semibold">Plata:</span> {config.beneficio_250}</p>
              )}
              {config.beneficio_500 && (
                <p className={puntos >= 500 ? 'text-yellow-700 font-semibold' : ''}>
                  <span className="font-semibold text-yellow-600">Oro (500 pts):</span> {config.beneficio_500}
                </p>
              )}
              <p className="pt-1">Por cada vianda que comprás, sumás 1 punto.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {misPedidos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-4">Todavía no tenés pedidos</p>
          <Button onClick={() => navigate('/pedido/nuevo')}>Hacer un pedido</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {misPedidos.map(p => (
            <Card key={p.id} className="animate-fade-in">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {new Date(p.fecha_pedido).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={estadoColor[p.estado]}>{estadoLabel[p.estado]}</Badge>
                    {p.estado === 'pendiente' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => abrirEditor(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  {p.items.map(i => {
                    const mi = i.menu_item || menuItems.find(m => m.id === i.menu_item_id);
                    return (
                      <div key={i.id} className="flex justify-between">
                        <span>{i.cantidad}x {mi?.nombre || 'Item'}</span>
                        <span>${(i.cantidad * i.precio_unitario).toLocaleString('es-AR')}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between border-t pt-2 mt-2 font-bold">
                  <span>Total</span>
                  <span className="text-accent">${p.total.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                  <span>Pago: {p.metodo_pago}</span>
                  <span>{p.necesita_envio ? `📍 ${p.direccion_envio}` : '🏠 Retiro en local'}</span>
                  {p.comentarios && <span className="italic">"{p.comentarios}"</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!pedidoEditando} onOpenChange={open => !open && setPedidoEditando(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Editar pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="font-semibold text-sm">Viandas</p>
              {itemsActivos.map(item => {
                const qty = cantidades[item.id] || 0;
                return (
                  <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${qty > 0 ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium leading-snug">{item.nombre}</p>
                      <p className="text-xs text-accent font-semibold">${item.precio.toLocaleString('es-AR')}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
                <div className="flex items-center gap-2"><RadioGroupItem value="efectivo" id="h-ef" /><Label htmlFor="h-ef">Efectivo</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="transferencia" id="h-tr" /><Label htmlFor="h-tr">Transferencia</Label></div>
              </RadioGroup>
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-semibold">¿Necesitás envío?</Label>
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

export default HistorialPage;
