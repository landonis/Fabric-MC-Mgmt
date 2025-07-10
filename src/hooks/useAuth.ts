import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../utils/api';
import { User, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = (): AuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      const response: AuthResponse = await api.login(username, password);
      api.setToken(response.token);
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (username: string, password: string): Promise<void> => {
    try {
      const response: AuthResponse = await api.register(username, password);
      api.setToken(response.token);
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = (): void => {
    api.clearToken();
    setUser(null);
  };

  const refreshUser = async (): Promise<void> => {
    try {
      // Implement user refresh if needed
      // For now, just check if token is still valid
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        return;
      }
      
      // You could add a /me endpoint to verify token and get current user
      // For now, we'll assume the token is valid if it exists
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        api.setToken(token);
        // In a real app, you'd verify the token with the server
        // For now, we'll just assume it's valid
        try {
          await refreshUser();
        } catch (error) {
          console.error('Token validation failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  return {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
  };
};