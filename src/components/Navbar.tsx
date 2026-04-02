import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo-cuchara.png';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
  const { auth } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    auth.logout();
    navigate('/menu');
    setOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        <Link to="/menu" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <img src={logo} alt="Mundo Prana" width={40} height={40} className="rounded-full" />
          <span className="font-display text-xl font-bold text-foreground">Mundo Prana</span>
        </Link>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        <div className={`${open ? 'flex' : 'hidden'} md:flex absolute md:static top-full left-0 right-0 bg-card md:bg-transparent flex-col md:flex-row items-center gap-3 p-4 md:p-0 border-b md:border-0 shadow-md md:shadow-none`}>

          <Link to="/menu" className="text-sm font-semibold text-foreground hover:text-primary transition-colors" onClick={() => setOpen(false)}>
            Menú
          </Link>

          {!auth.isLoggedIn && (
            <>
              <Link to="/login" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm">Iniciar sesión</Button>
              </Link>
              <Link to="/registro" onClick={() => setOpen(false)}>
                <Button size="sm">Registrarse</Button>
              </Link>
            </>
          )}

          {auth.isLoggedIn && auth.role === 'cliente' && (
            <>
              <Link to="/pedido/nuevo" className="text-sm font-semibold text-foreground hover:text-primary transition-colors" onClick={() => setOpen(false)}>
                Nuevo pedido
              </Link>
              <Link to="/pedido/historial" className="text-sm font-semibold text-foreground hover:text-primary transition-colors" onClick={() => setOpen(false)}>
                Mis pedidos
              </Link>
            </>
          )}

          {auth.isLoggedIn && auth.role === 'admin' && (
            <Link to="/admin" className="text-sm font-semibold text-foreground hover:text-primary transition-colors" onClick={() => setOpen(false)}>
              Panel Admin
            </Link>
          )}

          {auth.isLoggedIn && auth.role === 'superadmin' && (
            <>
              <Link to="/admin" className="text-sm font-semibold text-foreground hover:text-primary transition-colors" onClick={() => setOpen(false)}>
                Panel Admin
              </Link>
              <Link to="/superadmin" className="text-sm font-semibold text-foreground hover:text-primary transition-colors" onClick={() => setOpen(false)}>
                Superadmin
              </Link>
            </>
          )}

          {auth.isLoggedIn && (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" /> Salir
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
