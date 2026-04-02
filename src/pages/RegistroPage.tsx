import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import logo from '@/assets/logo-cuchara.png';
import { useToast } from '@/hooks/use-toast';

const RegistroPage = () => {
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', telefono: '', password: '' });
  const { auth } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    auth.register(form);
    toast({ title: '¡Cuenta creada!' });
    navigate('/pedido/nuevo');
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <img src={logo} alt="Mundo Prana" width={64} height={64} className="mx-auto mb-2" />
          <CardTitle className="font-display text-2xl">Crear cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nombre</Label><Input value={form.nombre} onChange={set('nombre')} required /></div>
              <div><Label>Apellido</Label><Input value={form.apellido} onChange={set('apellido')} required /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={set('email')} required /></div>
            <div><Label>Teléfono</Label><Input value={form.telefono} onChange={set('telefono')} placeholder="Opcional" /></div>
            <div><Label>Contraseña</Label><Input type="password" value={form.password} onChange={set('password')} required /></div>
            <Button type="submit" className="w-full">Registrarse</Button>
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tenés cuenta? <Link to="/login" className="text-primary font-semibold hover:underline">Iniciá sesión</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistroPage;
