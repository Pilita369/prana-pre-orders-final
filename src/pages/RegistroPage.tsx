import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const RegistroPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    password: '',
    confirmar: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmar) {
      toast({ title: 'Las contraseñas no coinciden', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await register({
      nombre: form.nombre,
      apellido: form.apellido,
      email: form.email,
      telefono: form.telefono || undefined,
      password: form.password,
    });
    setLoading(false);
    if (error) {
      toast({ title: error, variant: 'destructive' });
    } else {
      toast({ title: '¡Cuenta creada! Iniciá sesión para continuar 🌿' });
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">Crear cuenta</CardTitle>
          <p className="text-sm text-muted-foreground">Completá tus datos para registrarte</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" name="nombre" value={form.nombre} onChange={handleChange} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="apellido">Apellido</Label>
                <Input id="apellido" name="apellido" value={form.apellido} onChange={handleChange} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="telefono">Teléfono (opcional)</Label>
              <Input id="telefono" name="telefono" type="tel" value={form.telefono} onChange={handleChange} placeholder="Ej: 2994123456" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmar">Confirmar contraseña</Label>
              <Input id="confirmar" name="confirmar" type="password" value={form.confirmar} onChange={handleChange} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear cuenta'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Iniciá sesión
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistroPage;
