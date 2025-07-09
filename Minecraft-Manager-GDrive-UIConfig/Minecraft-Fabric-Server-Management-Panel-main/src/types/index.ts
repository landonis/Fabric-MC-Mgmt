export interface User {
  id: number;
  username: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface ServerStatus {
  running: boolean;
  pid?: number;
  uptime?: string;
  players?: number;
  memory?: string;
}

export interface Player {
  username: string;
  uuid: string;
  online: boolean;
  lastSeen?: string;
  playtime?: string;
  position?: {
    x: number;
    y: number;
    z: number;
  };
}

export interface PlayerInventory {
  uuid: string;
  inventory: Array<{
    slot: number;
    item: string;
    count: number;
    nbt?: any;
  }>;
}

export interface PlayerPosition {
  uuid: string;
  position: {
    x: number;
    y: number;
    z: number;
    dimension: string;
  };
}

export interface ModFile {
  id: number;
  filename: string;
  size: number;
  uploadedAt: string;
  active: boolean;
}

export interface ServerLog {
  timestamp: string;
  thread: string;
  level: string;
  message: string;
}

export interface WorldInfo {
  exists: boolean;
  name: string;
  size: number;
  sizeFormatted?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}