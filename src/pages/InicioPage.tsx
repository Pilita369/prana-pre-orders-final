import { useApp } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MessageCircle, ShoppingBag, Clock, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const estadoColor: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  en_preparacion: 'bg-blue-100 text-blue-800 border-blue-300',
  listo: 'bg-green-100 text-green-800 border-green-300',
  entregado: 'bg-muted text-muted-foreground',
};
const estadoLabel: Record<string, string> = {
  pendiente: 'Pendiente', en_preparacion: 'En preparación', listo: 'Listo', entregado: 'Entregado',
};

const InicioPage = () => {
  const { pedidos, config } = useApp();
  const { cliente } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const misPedidos = pedidos.filter(p => p.cliente_id === cliente?.id);
  const ultimosPedidos = misPedidos.slice(0, 3);

  // Puntos: 1 por vianda
  const puntos = misPedidos.reduce((total, p) =>
    total + p.items.reduce((s, i) => s + i.cantidad, 0), 0
  );
  const siguiente = puntos >= 500 ? null : puntos >= 250 ? 500 : 250;
  const progreso = puntos >= 500 ? 100 : puntos >= 250
    ? ((puntos - 250) / 250) * 100
    : (puntos / 250) * 100;
  const tier = puntos >= 500 ? 'Oro' : puntos >= 250 ? 'Plata' : null;

  const copiarAlias = () => {
    navigator.clipboard.writeText('nat.serv.mp');
    toast({ title: 'Alias copiado al portapapeles' });
  };

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">

      {/* Saludo */}
      <div className="animate-fade-in">
        <h1 className="font-display text-3xl font-bold text-foreground">
          {saludo}, {cliente?.nombre}!
        </h1>
        {config.mensaje_bienvenida && (
          <p className="text-muted-foreground mt-1">{config.mensaje_bienvenida}</p>
        )}
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" className="gap-2 h-14 text-base" onClick={() => navigate('/pedido/nuevo')}>
          <ShoppingBag className="h-5 w-5" /> Nuevo pedido
        </Button>
        <Button size="lg" variant="outline" className="gap-2 h-14 text-base" onClick={() => navigate('/pedido/historial')}>
          <Clock className="h-5 w-5" /> Mis pedidos
        </Button>
      </div>

      {/* Puntos */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star className={`h-5 w-5 ${tier === 'Oro' ? 'text-yellow-500' : tier === 'Plata' ? 'text-slate-500' : 'text-primary'}`} />
              <span className="font-bold text-lg">{puntos} puntos</span>
              {tier && (
                <Badge variant="outline" className={tier === 'Oro' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-slate-100 text-slate-700 border-slate-300'}>
                  {tier}
                </Badge>
              )}
            </div>
            {siguiente
              ? <span className="text-xs text-muted-foreground">Faltan {siguiente - puntos} para {siguiente === 250 ? 'Plata' : 'Oro'}</span>
              : <span className="text-xs text-yellow-600 font-semibold">Nivel máximo</span>
            }
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all ${tier === 'Oro' ? 'bg-yellow-400' : tier === 'Plata' ? 'bg-slate-400' : 'bg-primary'}`}
              style={{ width: `${Math.min(progreso, 100)}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Ganás 1 punto por cada vianda que comprás.</p>
            {puntos < 250 && config.beneficio_250 && (
              <p><span className="font-semibold text-slate-600">Plata (250 pts):</span> {config.beneficio_250}</p>
            )}
            {puntos >= 250 && puntos < 500 && config.beneficio_500 && (
              <p><span className="font-semibold text-yellow-600">Oro (500 pts):</span> {config.beneficio_500}</p>
            )}
            {puntos >= 500 && config.beneficio_500 && (
              <p className="text-yellow-700 font-semibold">Desbloqueaste: {config.beneficio_500}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Últimos pedidos */}
      {ultimosPedidos.length > 0 && (
        <div>
          <h2 className="font-semibold text-lg mb-3">Últimos pedidos</h2>
          <div className="space-y-3">
            {ultimosPedidos.map(p => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">
                      {new Date(p.fecha_pedido).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${estadoColor[p.estado]}`}>{estadoLabel[p.estado]}</Badge>
                      <span className="font-bold text-accent text-sm">${p.total.toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.items.map(i => `${i.cantidad}x ${i.menu_item?.nombre || 'Item'}`).join(', ')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          {misPedidos.length > 3 && (
            <Button variant="link" className="mt-2 px-0" onClick={() => navigate('/pedido/historial')}>
              Ver todos mis pedidos →
            </Button>
          )}
        </div>
      )}

      {/* Contacto Nati */}
      <Card>
        <CardContent className="p-4">
          <p className="font-semibold mb-3">Tu preventista</p>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <span className="text-2xl">🌿</span>
            </div>
            <div>
              <p className="font-bold text-lg">Nati</p>
              <p className="text-sm text-muted-foreground">Mundo Prana</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <a
              href={`https://wa.me/5492995973737`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full gap-2">
                <MessageCircle className="h-4 w-4 text-green-600" />
                WhatsApp: 299 597-3737
              </Button>
            </a>
            <div className="flex items-center justify-between bg-secondary rounded-lg px-4 py-3">
              <div>
                <p className="text-xs text-muted-foreground">Alias Mercado Pago (señas)</p>
                <p className="font-semibold">nat.serv.mp</p>
              </div>
              <Button variant="ghost" size="icon" onClick={copiarAlias}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default InicioPage;
