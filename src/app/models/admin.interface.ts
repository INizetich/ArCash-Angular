export interface UserResponse {
  id: number;
  name: string;
  lastName: string;
  dni: string;
  email: string;
  username: string;
  idAccount: number | null;
  enabled: boolean;
  active: boolean;
}

export interface AdminRequest {
  name: string;
  lastName: string;
  dni: string;
  email: string;
  username: string;
  password: string;
}

export interface AdminResponse {
  mensaje?: string;
  message?: string;
  success?: boolean;
}
