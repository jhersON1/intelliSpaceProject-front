import { Injectable, inject } from '@angular/core';
import { TokenService } from './token.service';
import { userRole } from '../interfaces';
import { LoggerService } from '../../core/services/logger.service';
import { JwtPayload, TokenUserInfo, TokenDecodeResult } from '../../core/types/jwt.types';

/**
 * Servicio responsable de decodificar y extraer información de tokens JWT
 */
@Injectable({
  providedIn: 'root'
})
export class TokenDecoderService {
  private readonly tokenService = inject(TokenService);
  private readonly logger = inject(LoggerService);  /**
   * Decodifica el token JWT actual de forma segura
   */
  decodeCurrentToken(): TokenDecodeResult {
    const token = this.tokenService.getToken();
    if (!token) {
      // No logear cuando no hay token - es normal después del logout o para usuarios no autenticados
      return { success: false, error: 'No token available' };
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        this.logger.error('Token tiene formato inválido', {}, 'TokenDecoderService');
        return { success: false, error: 'Invalid token format' };
      }

      const [, payloadB64] = parts;
      const json = atob(payloadB64);
      const payload = JSON.parse(json) as JwtPayload;
      
      this.logger.debug('Token decodificado exitosamente', { 
        hasRole: !!payload.rol,
        exp: payload.exp 
      }, 'TokenDecoderService');
      
      return { success: true, payload };
    } catch (error) {
      this.logger.error('Error al decodificar token', { error }, 'TokenDecoderService');
      return { success: false, error: 'Invalid token format' };
    }
  }  /**
   * Obtiene el rol del usuario desde el token
   */
  getUserRoleFromToken(): userRole | null {
    const result = this.decodeCurrentToken();
    
    if (!result.success || !result.payload?.rol) {
      // Solo logear si hay token pero no se puede decodificar (error real)
      if (this.tokenService.getToken()) {
        this.logger.warn('No se encontró rol en el token válido', {}, 'TokenDecoderService');
      }
      return null;
    }    // Retornar el rol tal como viene del token
    const roleString = result.payload.rol;
    console.log('TokenDecoderService: Role from token:', { roleString, type: typeof roleString });
    return roleString as userRole;
  }

  /**
   * Verifica si el token ha expirado
   */
  isTokenExpired(): boolean {
    const result = this.decodeCurrentToken();
    
    if (!result.success || !result.payload?.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return result.payload.exp < currentTime;
  }

  /**
   * Obtiene información adicional del usuario desde el token
   */
  getUserInfoFromToken(): TokenUserInfo | null {
    const result = this.decodeCurrentToken();
    
    if (!result.success || !result.payload) {
      return null;
    }

    const { id, email, rol } = result.payload;
    return { id, email, rol };
  }
}
