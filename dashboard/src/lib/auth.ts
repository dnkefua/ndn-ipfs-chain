import Cookie from 'js-cookie';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  tenant_id: string;
  wallet_addr?: string;
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookie.get('jwt');
    if (!token) {
      setLoading(false);
      router.push('/auth');
      return;
    }

    const decoded = decodeJWT(token);
    if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
      Cookie.remove('jwt');
      setLoading(false);
      router.push('/auth');
      return;
    }

    setUser(decoded as User);
    setLoading(false);
  }, [router]);

  const logout = () => {
    Cookie.remove('jwt');
    router.push('/auth');
  };

  return { user, loading, logout, isAuthenticated: !!user };
}

function decodeJWT(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(atob(parts[1]));
    return decoded;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string) {
  Cookie.set('jwt', token, { path: '/', secure: true, sameSite: 'lax' });
}

export function clearAuthToken() {
  Cookie.remove('jwt');
}
