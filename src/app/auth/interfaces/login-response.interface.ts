import { User } from './user.interface';

export interface LoginResponse {
  id: string;
  email: string;
  role: string;
  token: string;
}
