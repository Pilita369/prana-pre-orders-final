import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Minus, Plus, Send, MessageCircle, Loader2 } from 'lucide-react';
import { Pedido } from '@/lib/types';

const NuevoPedidoPage = () => {
  const { cliente, role } = useAuth();
  const { menuItems, config, refetchPedidos } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();

  const items = menuItems.filter(i => i.activo);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [necesitaEnvio, setNecesitaEnvio] = useState(false);
  const [direccion, setDireccion] = useState(cliente?.direccion_default || '');
  const [comentarios, setComentarios] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<Pedido | null>(null);

  const setCant = (id: string, delta: number) => {
    setCantidades(prev => {
      const v = Math.max(0, (prev[id] || 0) + delta);
      return { ...prev, [id]: v };
    });
  };

  const totalItems = Object.values(cantidades).reduce((s, v) => s + v, 0);
  const total = Object.entries(cantidades).reduce((s, [id, qty]) => {
    const item = items.find(i => i.id === id);
    return s + (item ? item.precio * qty : 0);
  }, 0);

  const handleConfirmar = async () => {
    if (!cliente) return;
    if (totalItems === 0) { toast({ title: 'Agregá al menos una vianda', variant: 'destructive' }); return; }
    if (necesitaEnvio && !direccion.trim()) { toast({ title: 'Ingresá la dirección de envío', variant: 'destructive' }); return; }

    setSubmitting(true);

    const { data: pedido, error: pedidoError } = await supabase
      .from('prana_pedidos')
      .insert({
        cliente_id: cliente.id,
        total,
        metodo_pago: metodoPago,
        necesita_envio: necesitaEnvio,
        direccion_envio: necesitaEnvio ? direccion : null,
        comentarios: comentarios || null,
        estado: 'pendiente',
      })
      .select('id')
      .single();

    if (pedidoError || !pedido) {
      toast({ title: 'Error al crear el pedido', variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    const pedidoItems = Object.entries(cantidades)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({
        pedido_id: pedido.id,
        menu_item_id: id,
        cantidad: q,
        precio_unitario: items.find(i => i.id === id)!.precio,
      }));

    const { error: itemsError } = await supabase.from('prana_pedido_items').insert(pedidoItems);
    if (itemsError) {
      toast({ title: 'Error al guardar los items', variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    await refetchPedidos();

    const pedidoParaMostrar: Pedido = {
      id: pedido.id,
      cliente_id: cliente.id,
      total,
      metodo_pago: metodoPago,
      necesita_envio: necesitaEnvio,
      direccion_envio: necesitaEnvio ? direccion : undefined,
      comentarios: comentarios || undefined,
      estado: 'pendiente',
      fecha_pedido: new Date().toISOString(),
      items: Object.entries(cantidades)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => ({
          id: '',
          pedido_id: pedido.id,
          menu_item_id: id,
          cantidad: q,
          precio_unitario: items.find(i => i.id === id)!.precio,
          menu_item: items.find(i => i.id === id),
        })),
      cliente,
    };

    setPedidoConfirmado(pedidoParaMostrar);
    setSubmitting(false);
  };

  const buildWhatsappMsg = (p: Pedido) => {
    const lineas = p.items.map(i => `• ${i.cantidad}x ${i.menu_item?.nombre || 'Item'}`).join('\n');
    let msg = `Hola Nati! Te hago un pedido de Mundo Prana 🌿\n\n${lineas}\nTotal: $${p.total.toLocaleString('es-AR')}\nPago: ${p.metodo_pago}\n`;
    if (p.necesita_envio) msg += `Envío a: ${p.direccion_envio}\n`;
    else msg += `Retiro en local\n`;
    if (p.comentarios) msg += `\n${p.comentarios}`;
    return encodeURIComponent(msg);
  };

  if (pedidoConfirmado) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Card className="animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">¡Pedido confirmado! 🎉</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {pedidoConfirmado.items.map((i, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{i.cantidad}x {i.menu_item?.nombre}</span>
                  <span className="font-semibold">${(i.cantidad * i.precio_unitario).toLocaleString('es-AR')}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-accent">${pedidoConfirmado.total.toLocaleString('es-AR')}</span>
              </div>
            </div>

            {pedidoConfirmado.metodo_pago === 'transferencia' && (
              <div className="bg-secondary rounded-lg p-4">
                <p className="font-semibold mb-2">Datos para transferencia:</p>
                <pre className="text-sm whitespace-pre-wrap text-muted-foreground">{config.datos_bancarios}</pre>
              </div>
            )}

            <a
              href={`https://wa.me/${config.whatsapp_nati}?text=${buildWhatsappMsg(pedidoConfirmado)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full gap-2">
                <MessageCircle className="h-5 w-5" /> Enviar pedido por WhatsApp
              </Button>
            </a>

            <Button variant="outline" className="w-full" onClick={() => navigate('/pedido/historial')}>
              Ver mis pedidos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="font-display text-3xl font-bold mb-6 text-center">Nuevo pedido</h1>

      <div className="space-y-3 mb-6">
        {items.map(item => {
          const qty = cantidades[item.id] || 0;
          return (
            <Card key={item.id} className={`transition-all ${qty > 0 ? 'ring-2 ring-primary/40' : ''}`}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-snug">{item.nombre}</p>
                  <p className="text-accent font-bold">${item.precio.toLocaleString('es-AR')}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCant(item.id, -1)} disabled={qty === 0}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-bold">{qty}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCant(item.id, 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {totalItems > 0 && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="text-base font-semibold">Método de pago</Label>
                <RadioGroup value={metodoPago} onValueChange={v => setMetodoPago(v as any)} className="flex gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="efectivo" id="efectivo" />
                    <Label htmlFor="efectivo">Efectivo</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="transferencia" id="transferencia" />
                    <Label htmlFor="transferencia">Transferencia</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">¿Necesitás envío?</Label>
                <Switch checked={necesitaEnvio} onCheckedChange={setNecesitaEnvio} />
              </div>

              {necesitaEnvio && (
                <div>
                  <Label>Dirección de envío</Label>
                  <Input value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Tu dirección completa" />
                </div>
              )}

              <div>
                <Label>Comentarios (opcional)</Label>
                <Textarea value={comentarios} onChange={e => setComentarios(e.target.value)} placeholder="Sin sal, doble porción, etc." />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
            <div>
              <p className="text-sm text-muted-foreground">{totalItems} vianda{totalItems > 1 ? 's' : ''}</p>
              <p className="text-2xl font-bold text-accent">${total.toLocaleString('es-AR')}</p>
            </div>
            <Button size="lg" className="gap-2" onClick={handleConfirmar} disabled={submitting}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              Confirmar pedido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NuevoPedidoPage;
