import { useState } from 'react';
import { useApp } from '@/context/AppContext';
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
import { Pencil, Minus, Plus, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Pedido } from '@/lib/types';

const estadoColor: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  en_preparacion: 'bg-blue-100 text-blue-800 border-blue-300',
  listo: 'bg-green-100 text-green-800 border-green-300',
  entregado: 'bg-muted text-muted-foreground',
};

const estadoLabel: Record<string, string> = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
};

const HistorialPage = () => {
  const { auth, pedidos, setPedidos, menuItems } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estado del editor
  const [pedidoEditando, setPedidoEditando] = useState<Pedido | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [necesitaEnvio, setNecesitaEnvio] = useState(false);
  const [direccion, setDireccion] = useState('');
  const [comentarios, setComentarios] = useState('');

  if (!auth.isLoggedIn) { navigate('/login'); return null; }

  const misPedidos = pedidos.filter(p => p.cliente_id === auth.cliente?.id);
  const itemsActivos = menuItems.filter(i => i.activo);

  const abrirEditor = (p: Pedido) => {
    // Cargar los valores actuales del pedido en el form
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
    setCantidades(prev => {
      const v = Math.max(0, (prev[id] || 0) + delta);
      return { ...prev, [id]: v };
    });
  };

  const totalItems = Object.values(cantidades).reduce((s, v) => s + v, 0);
  const totalCalc = Object.entries(cantidades).reduce((s, [id, qty]) => {
    const item = itemsActivos.find(i => i.id === id);
    return s + (item ? item.precio * qty : 0);
  }, 0);

  const guardarEdicion = () => {
    if (!pedidoEditando) return;
    if (totalItems === 0) {
      toast({ title: 'Agregá al menos una vianda', variant: 'destructive' });
      return;
    }
    if (necesitaEnvio && !direccion.trim()) {
      toast({ title: 'Ingresá la dirección de envío', variant: 'destructive' });
      return;
    }

    const nuevosItems = Object.entries(cantidades)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({
        id: `pi${Date.now()}${id}`,
        pedido_id: pedidoEditando.id,
        menu_item_id: id,
        cantidad: q,
        precio_unitario: itemsActivos.find(i => i.id === id)!.precio,
        menu_item: itemsActivos.find(i => i.id === id),
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
          }
        : p
    ));

    toast({ title: '¡Pedido actualizado! ✏️' });
    setPedidoEditando(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="font-display text-3xl font-bold mb-6 text-center">Mis pedidos</h1>

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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:text-primary"
                        title="Editar pedido"
                        onClick={() => abrirEditor(p)}
                      >
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
                  <span>{p.necesita_envio ? `📍 Envío: ${p.direccion_envio}` : '🏠 Retiro en local'}</span>
                  {p.comentarios && <span className="italic">"{p.comentarios}"</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal editor de pedido */}
      <Dialog open={!!pedidoEditando} onOpenChange={open => !open && setPedidoEditando(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Editar pedido</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Selector de viandas */}
            <div className="space-y-2">
              <p className="font-semibold text-sm">Viandas</p>
              {itemsActivos.map(item => {
                const qty = cantidades[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${qty > 0 ? 'border-primary/40 bg-primary/5' : 'border-border'}`}
                  >
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

            {/* Método de pago */}
            <div>
              <Label className="font-semibold">Método de pago</Label>
              <RadioGroup value={metodoPago} onValueChange={v => setMetodoPago(v as any)} className="flex gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="efectivo" id="ed-efectivo" />
                  <Label htmlFor="ed-efectivo">Efectivo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="transferencia" id="ed-transferencia" />
                  <Label htmlFor="ed-transferencia">Transferencia</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Envío */}
            <div className="flex items-center justify-between">
              <Label className="font-semibold">¿Necesitás envío?</Label>
              <Switch checked={necesitaEnvio} onCheckedChange={setNecesitaEnvio} />
            </div>
            {necesitaEnvio && (
              <div>
                <Label>Dirección de envío</Label>
                <Input value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Tu dirección completa" />
              </div>
            )}

            {/* Comentarios */}
            <div>
              <Label>Comentarios</Label>
              <Textarea value={comentarios} onChange={e => setComentarios(e.target.value)} placeholder="Sin sal, doble porción, etc." />
            </div>

            {/* Total */}
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

export default HistorialPage;
