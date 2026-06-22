import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthService } from '../services/auth.service';
import type { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  activateAccount: (userCodeId: string, email: string, password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AuthService.getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    const { data: { subscription } } = AuthService.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { user, error } = await AuthService.signIn(email, password);
    if (user) setUser(user);
    return { error };
  };

  const signOut = async () => {
    await AuthService.signOut();
    setUser(null);
  };

  const activateAccount = async (userCodeId: string, email: string, password: string) => {
    const { user, error } = await AuthService.activateAccount(userCodeId, email, password);
    if (user) setUser(user);
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, activateAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
