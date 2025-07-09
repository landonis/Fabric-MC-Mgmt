export interface User {
  id: number;
  username: string;
  is_admin: number;
  must_change_password?: number;
  created_at?: string;
  password_hash?: string;
}
