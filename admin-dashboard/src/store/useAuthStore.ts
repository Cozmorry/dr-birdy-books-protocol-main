import { create } from 'zustand';
import { api } from '../lib/api';

interface Admin {
  id: string;
  username: string;
  email: string;
  role: string;
  lastLogin?: string;
}

interface AuthState {
  admin: Admin | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadAdmin: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  admin: null,
  token: localStorage.getItem('adminToken'),
  isAuthenticated: false, // Will be set to true after token validation
  isLoading: true, // Start as loading to validate token
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.login(username, password);
      
      if (response.success) {
        const { token, admin } = response.data;
        
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminUser', JSON.stringify(admin));
        
        set({
          admin,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    set({
      admin: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  loadAdmin: async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      set({ isAuthenticated: false, isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const response = await api.getMe();
      
      if (response.success) {
        set({
          admin: response.data,
          token: token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // Token invalid
        set({
          admin: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      }
    } catch (error) {
      // Token invalid or expired
      set({
        admin: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
    }
  },

  clearError: () => set({ error: null }),
}));


