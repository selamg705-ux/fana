import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.ts';
import { safeApiFetch } from '../utils/api.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isSeller: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('mela_token');
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('mela_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          ...parsed,
          fullName: parsed.fullName || parsed.full_name || 'User',
          role: parsed.role || 'customer'
        };
      }
      return null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async (currentToken: string) => {
    try {
      const result = await safeApiFetch<User>('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      });
      if (result.ok && result.data) {
        const normalized: User = {
          ...result.data,
          fullName: result.data.fullName || (result.data as any).full_name || 'User',
          role: result.data.role || 'customer'
        };
        setUser(normalized);
        try {
          localStorage.setItem('mela_user', JSON.stringify(normalized));
        } catch {}
      } else if (result.status === 401 || result.status === 403) {
        // Explicitly unauthorized - token is invalid or expired
        try {
          localStorage.removeItem('mela_token');
          localStorage.removeItem('mela_user');
        } catch {}
        setToken(null);
        setUser(null);
      }
      // If network is offline or server returned transient 500, retain cached user from localStorage
    } catch (err) {
      console.warn('Failed to fetch user session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    const normalizedUser: User = {
      ...newUser,
      fullName: newUser?.fullName || (newUser as any)?.full_name || 'User',
      role: newUser?.role || 'customer'
    };
    try {
      localStorage.setItem('mela_token', newToken);
      localStorage.setItem('mela_user', JSON.stringify(normalizedUser));
    } catch (e) {
      console.warn('Could not persist auth to localStorage:', e);
    }
    setToken(newToken);
    setUser(normalizedUser);
  };

  const logout = () => {
    try {
      localStorage.removeItem('mela_token');
      localStorage.removeItem('mela_user');
    } catch {}
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: Partial<User>) => {
    if (user) {
      const merged = { ...user, ...updatedUser };
      setUser(merged);
      try {
        localStorage.setItem('mela_user', JSON.stringify(merged));
      } catch {}
    }
  };

  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.dbRole === 'admin' || user?.role === 'admin' || isSuperAdmin;
  const isSeller = user?.role === 'seller' || isSuperAdmin || !!user?.sellerId;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isSuperAdmin,
        isAdmin,
        isSeller,
        login,
        logout,
        updateUser,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
