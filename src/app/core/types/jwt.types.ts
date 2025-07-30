import { userRole } from '../../auth/interfaces';

export interface JwtPayload {
  id: string;
  email: string;
  rol: string;
  exp: number;
  iat?: number;
}

export interface TokenUserInfo {
  id: string;
  email: string;
  rol: string;
}

export interface TokenDecodeResult {
  success: boolean;
  payload?: JwtPayload;
  error?: string;
}
