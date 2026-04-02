import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import logo from '@/assets/logo-cuchara.png';
import { useToast } from '@/hooks/use-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { auth } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = auth.login(email, password);
    if (ok) {
      toast({ title: '¡Bienvenido/a!' });
      if (email === 'admin@prana.com') navigate('/admin');
      else if (email === 'super@prana.com') navigate('/superadmin');
      else navigate('/pedido/nuevo');
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <img src={logo} alt="Mundo Prana" width={64} height={64} className="mx-auto mb-2" />
          <CardTitle className="font-display text-2xl">Iniciar sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com" />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full">Entrar</Button>
            <p className="text-center text-sm text-muted-foreground">
              ¿No tenés cuenta? <Link to="/registro" className="text-primary font-semibold hover:underline">Registrate</Link>
            </p>
            <div className="text-xs text-muted-foreground border-t pt-3 mt-3 space-y-1">
              <p>🧪 <strong>Demo:</strong> Usá cualquier email para entrar como cliente</p>
              <p>admin@prana.com → Admin | super@prana.com → Superadmin</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
