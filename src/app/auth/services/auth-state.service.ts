import { Injectable, inject, signal, computed } from '@angular/core';
import { User, AuthStatus, userRole } from '../interfaces';
import { LoggerService } from '../../core/services/logger.service';
import { TokenDecoderService } from './token-decoder.service';

/**
 * Servicio responsable de manejar el estado de autenticación del usuario
 */
@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private readonly logger = inject(LoggerService);
  private readonly tokenDecoder = inject(TokenDecoderService);

  private readonly _currentUser = signal<User | null>(null, {
    equal: (a, b) => a?.id === b?.id
  });
  
  private readonly _authStatus = signal<AuthStatus>(AuthStatus.checking);
  // Public readonly signals
  public readonly currentUser = computed(() => this._currentUser());
  public readonly authStatus = computed(() => this._authStatus());
  public readonly isAuthenticated = computed(() => this._authStatus() === AuthStatus.authenticated);
  public readonly isChecking = computed(() => this._authStatus() === AuthStatus.checking);  public readonly isVendor = computed(() => {
    const user = this._currentUser();
    const role = this.getCurrentUserRole();
    this.logger.debug('Computed isVendor:', { 
      hasUser: !!user, 
      role, 
      isVendor: role === userRole.VENDOR 
    }, 'AuthStateService');
    return role === userRole.VENDOR;
  });
  public readonly isConsumer = computed(() => {
    const user = this._currentUser();
    const role = this.getCurrentUserRole();
    this.logger.debug('Computed isConsumer:', { 
      hasUser: !!user, 
      role, 
      isConsumer: role === userRole.CONSUMER 
    }, 'AuthStateService');
    return role === userRole.CONSUMER;
  });

  /**
   * Establece el usuario autenticado y cambia el estado a autenticado
   */
  setAuthenticatedUser(user: User): void {
    this.logger.debug('Estableciendo usuario autenticado', { userId: user.id }, 'AuthStateService');
    this._currentUser.set(user);
    this._authStatus.set(AuthStatus.authenticated);
  }

  /**
   * Limpia el estado de autenticación
   */
  clearAuthState(): void {
    this.logger.debug('Limpiando estado de autenticación', {}, 'AuthStateService');
    this._currentUser.set(null);
    this._authStatus.set(AuthStatus.notAuthenticated);
  }
  /**
   * Establece el estado como "verificando"
   */
  setCheckingStatus(): void {
    this._authStatus.set(AuthStatus.checking);
  }
  
  /**
   * Obtiene el rol del usuario actual
   */
  getCurrentUserRole(): userRole | null {
    return this.tokenDecoder.getUserRoleFromToken();
  }
}
