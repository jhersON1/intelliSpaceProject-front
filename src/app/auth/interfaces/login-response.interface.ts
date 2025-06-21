import { User } from './user.interface';

export interface LoginResponse {
  id: string;
  email: string;
  role: string; // Viene como string desde el backend
  token: string;
}
