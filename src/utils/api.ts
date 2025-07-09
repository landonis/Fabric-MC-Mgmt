const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  private async upload(endpoint: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async login(username: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async register(username: string, password: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Server endpoints
  async getServerStatus() {
    return this.request('/server/status');
  }

  async startServer() {
    return this.request('/server/start', { method: 'POST' });
  }

  async stopServer() {
    return this.request('/server/stop', { method: 'POST' });
  }

  async restartServer() {
    return this.request('/server/restart', { method: 'POST' });
  }

  async getServerLogs() {
    return this.request('/server/logs');
  }

  // Mod endpoints
  async uploadMod(file: File) {
    return this.upload('/mods', file, 'mod');
  }

  async getMods() {
    return this.request('/mods');
  }

  async deleteMod(id: number) {
    return this.request(`/mods/${id}`, { method: 'DELETE' });
  }

  // World endpoints
  async getWorldInfo() {
    return this.request('/world/info');
  }

  async exportWorld() {
    const response = await fetch(`${API_BASE}/world/export`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.blob();
  }

  async importWorld(file: File) {
    return this.upload('/world/import', file, 'world');
  }

  // Player endpoints
  async getPlayers() {
    return this.request('/players');
  }

  async getPlayerInventory(uuid: string) {
    return this.request(`/players/${uuid}/inventory`);
  }

  async getPlayerPosition(uuid: string) {
    return this.request(`/players/${uuid}/position`);
  }

  async kickPlayer(uuid: string, reason: string) {
    return this.request(`/players/${uuid}/kick`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async sendPlayerMessage(uuid: string, message: string) {
    return this.request(`/players/${uuid}/message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }
}

export const api = new ApiClient();