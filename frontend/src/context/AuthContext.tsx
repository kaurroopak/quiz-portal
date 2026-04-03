import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

const API = 'http://localhost:4000/api';

interface User { id: string; name: string; email: string; role: 'student' | 'admin'; }
interface AuthCtx { user: User | null; token: string | null; login: (email: string, password: string) => Promise<void>; logout: () => void; loading: boolean; }

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${stored}` } })
        .then(r => { setUser(r.data); setToken(stored); })
        .catch(() => { localStorage.removeItem('token'); setToken(null); })
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => { localStorage.removeItem('token'); setToken(null); setUser(null); };

  return <AuthContext.Provider value={{ user, token, login, logout, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
export const apiClient = (token: string | null) => axios.create({ baseURL: API, headers: token ? { Authorization: `Bearer ${token}` } : {} });
