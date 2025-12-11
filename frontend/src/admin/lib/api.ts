import axios, { AxiosInstance, AxiosError } from 'axios';

// Use environment variable or default to localhost:5001
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('adminToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Don't redirect on login endpoint - let the login page handle the error
          const isLoginEndpoint = error.config?.url?.includes('/auth/login');
          
          if (!isLoginEndpoint) {
            // Unauthorized - clear token and redirect to admin login
            // Only redirect if we're not already on the login page
            const currentPath = window.location.pathname;
            if (!currentPath.includes('/admin/login')) {
              localStorage.removeItem('adminToken');
              localStorage.removeItem('adminUser');
              window.location.href = '/admin/login';
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(username: string, password: string) {
    const response = await this.client.post('/auth/login', { username, password });
    return response.data;
  }

  async getMe() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await this.client.put('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  async createAdmin(data: { username: string; email: string; password: string; role?: string }) {
    const response = await this.client.post('/auth/create-admin', data);
    return response.data;
  }

  // Blog endpoints
  async getBlogPosts(params?: any) {
    const response = await this.client.get('/blog', { params });
    return response.data;
  }

  async getBlogPost(id: string) {
    const response = await this.client.get(`/blog/${id}`);
    return response.data;
  }

  async createBlogPost(data: any, image?: File | null) {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('content', data.content);
    formData.append('excerpt', data.excerpt);
    formData.append('status', data.status || 'draft');
    if (data.tags) {
      formData.append('tags', JSON.stringify(data.tags));
    }
    if (image) {
      formData.append('image', image);
    }

    const response = await this.client.post('/blog', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updateBlogPost(id: string, data: any, image?: File | null) {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('content', data.content);
    formData.append('excerpt', data.excerpt);
    formData.append('status', data.status || 'draft');
    if (data.tags) {
      formData.append('tags', JSON.stringify(data.tags));
    }
    if (image) {
      formData.append('image', image);
    }

    const response = await this.client.put(`/blog/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteBlogPost(id: string) {
    const response = await this.client.delete(`/blog/${id}`);
    return response.data;
  }

  // File endpoints
  async getFiles(params?: any) {
    const response = await this.client.get('/files', { params });
    return response.data;
  }

  async getFile(id: string) {
    const response = await this.client.get(`/files/${id}`);
    return response.data;
  }

  async uploadFile(file: File, description: string, tier: number, folder?: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description);
    formData.append('tier', tier.toString());
    if (folder) {
      formData.append('folder', folder);
    }

    const response = await this.client.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updateFile(id: string, data: any) {
    const response = await this.client.put(`/files/${id}`, data);
    return response.data;
  }

  async deleteFile(id: string) {
    const response = await this.client.delete(`/files/${id}`);
    return response.data;
  }

  getFileDownloadUrl(id: string) {
    return `${API_BASE_URL}/files/${id}/download`;
  }

  // Analytics endpoints
  async getDashboardAnalytics(params?: any) {
    const response = await this.client.get('/analytics/dashboard', { params });
    return response.data;
  }

  async getFileAnalytics(params?: any) {
    const response = await this.client.get('/analytics/files', { params });
    return response.data;
  }

  async getBlogAnalytics(params?: any) {
    const response = await this.client.get('/analytics/blog', { params });
    return response.data;
  }

  // Feedback endpoints
  async getFeedback(params?: any) {
    const response = await this.client.get('/feedback', { params });
    return response.data;
  }

  async getFeedbackStats() {
    const response = await this.client.get('/feedback/stats');
    return response.data;
  }

  async updateFeedbackStatus(id: string, status: string, adminNotes?: string) {
    const response = await this.client.patch(`/feedback/${id}`, { status, adminNotes });
    return response.data;
  }

  // Folder endpoints
  async getFolders(params?: any) {
    const response = await this.client.get('/folders', { params });
    return response.data;
  }

  async getFolder(id: string) {
    const response = await this.client.get(`/folders/${id}`);
    return response.data;
  }

  async getFolderTree(params?: any) {
    const response = await this.client.get('/folders/tree', { params });
    return response.data;
  }

  async createFolder(data: {
    name: string;
    description?: string;
    parentFolder?: string;
    tier: number;
    color?: string;
    icon?: string;
    order?: number;
  }) {
    const response = await this.client.post('/folders', data);
    return response.data;
  }

  async updateFolder(id: string, data: any) {
    const response = await this.client.put(`/folders/${id}`, data);
    return response.data;
  }

  async deleteFolder(id: string, moveFilesTo?: string) {
    const response = await this.client.delete(`/folders/${id}`, {
      params: { moveFilesTo },
    });
    return response.data;
  }

  // Health check
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const api = new ApiClient();


