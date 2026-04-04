import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserRole, Cliente } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  cliente: Cliente | null;
  loading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (data: { nombre: string; apellido: string; email: string; telefono?: string; password: string }) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      const [roleRes, clienteRes] = await Promise.all([
        supabase.from('prana_roles').select('role').eq('user_id', userId).maybeSingle(),
        supabase.from('prana_clientes').select('*').eq('user_id', userId).maybeSingle(),
      ]);
      if (roleRes.data) setRole(roleRes.data.role as UserRole);
      if (clienteRes.data) setCliente(clienteRes.data as Cliente);
    } catch (e) {
      console.error('Error fetching user data:', e);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => {
      clearTimeout(timeout);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setRole(null);
        setCliente(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: 'Email o contraseña incorrectos' };
    return { error: null };
  };

  const register = async (data: { nombre: string; apellido: string; email: string; telefono?: string; password: string }) => {
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    if (signUpError) return { error: 'No se pudo crear la cuenta' };
    if (!authData.user) return { error: 'Error al crear el usuario' };

    // Crear perfil cliente
    const { error: clienteError } = await supabase.from('prana_clientes').insert({
      user_id: authData.user.id,
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      telefono: data.telefono || null,
    });

    if (clienteError) return { error: 'Error al guardar el perfil' };

    // Asignar rol de cliente
    const { error: rolError } = await supabase.from('prana_roles').insert({
      user_id: authData.user.id,
      role: 'cliente',
    });

    if (rolError) return { error: 'Error al asignar el rol' };

    // Sincronizar el estado local con el rol recién creado
    setRole('cliente');
    setCliente({
      id: '',
      user_id: authData.user.id,
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      telefono: data.telefono,
      created_at: new Date().toISOString(),
    });

    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setCliente(null);
  };

  return (
    <AuthContext.Provider value={{
      user, session, role, cliente, loading,
      isLoggedIn: !!session,
      login, register, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
