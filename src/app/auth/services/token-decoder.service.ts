import { Injectable, inject } from '@angular/core';
import { TokenService } from './token.service';
import { userRole } from '../interfaces';
import { LoggerService } from '../../core/services/logger.service';
import { JwtPayload, TokenUserInfo, TokenDecodeResult } from '../../core/types/jwt.types';

@Injectable({
  providedIn: 'root'
})
export class TokenDecoderService {
  private readonly tokenService = inject(TokenService);
  private readonly logger = inject(LoggerService);

  decodeCurrentToken(): TokenDecodeResult {
    const token = this.tokenService.getToken();
    if (!token) {
      return { success: false, error: 'No token available' };
    }

    return this.decodeToken(token);
  }

  decodeToken(token: string): TokenDecodeResult {
    if (!token) {
      return { success: false, error: 'No token provided' };
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
  }

  getUserRoleFromToken(): userRole | null {
    const result = this.decodeCurrentToken();
    
    if (!result.success || !result.payload?.rol) {
      if (this.tokenService.getToken()) {
        this.logger.warn('No se encontró rol en el token válido', {}, 'TokenDecoderService');
      }
      return null;
    }

    const roleString = result.payload.rol;
    console.log('TokenDecoderService: Role from token:', { roleString, type: typeof roleString });
    
    // Validar que sea un rol válido
    if (roleString === 'ADMIN' || roleString === 'VENDOR' || roleString === 'CONSUMER') {
      return roleString as userRole;
    }
    
    console.warn('TokenDecoderService: Invalid role from token:', roleString);
    return null;
  }

  isTokenExpired(): boolean {
    const result = this.decodeCurrentToken();
    
    if (!result.success || !result.payload?.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return result.payload.exp < currentTime;
  }

  getUserInfoFromToken(): TokenUserInfo | null {
    const result = this.decodeCurrentToken();
    
    if (!result.success || !result.payload) {
      return null;
    }

    const { id, email, rol } = result.payload;
    return { id, email, rol };
  }
}
