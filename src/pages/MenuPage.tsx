import { MENU_ITEMS } from '@/lib/mock-data';
import { useApp } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Leaf } from 'lucide-react';

const MenuPage = () => {
  const { menuItems } = useApp();
  const items = menuItems.filter(i => i.activo);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-10 animate-fade-in">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">Nuestro Menú</h1>
        <p className="text-muted-foreground text-lg">Viandas congeladas caseras y saludables 🌿</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item, i) => (
          <Card key={item.id} className="animate-fade-in overflow-hidden hover:shadow-lg transition-shadow" style={{ animationDelay: `${i * 60}ms` }}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-full bg-primary/10 p-2 shrink-0">
                  <Leaf className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground leading-snug mb-1">{item.nombre}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{item.descripcion}</p>
                  <span className="inline-block font-bold text-accent text-lg">
                    ${item.precio.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MenuPage;
