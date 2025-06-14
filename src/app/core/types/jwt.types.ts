import { userRole } from '../../auth/interfaces';

/**
 * Estructura del payload del JWT
 */
export interface JwtPayload {
  id: string;
  email: string;
  rol: userRole;
  exp: number;
  iat?: number;
}

/**
 * Información del usuario extraída del token
 */
export interface TokenUserInfo {
  id: string;
  email: string;
  rol: userRole;
}

/**
 * Resultado de la decodificación del token
 */
export interface TokenDecodeResult {
  success: boolean;
  payload?: JwtPayload;
  error?: string;
}
