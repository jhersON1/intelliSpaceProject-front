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
  public readonly isChecking = computed(() => this._authStatus() === AuthStatus.checking);

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

  /**
   * Verifica si el usuario actual es vendor
   */
  isVendor(): boolean {
    const role = this.getCurrentUserRole();
    return role === userRole.VENDOR;
  }

  /**
   * Verifica si el usuario actual es consumer
   */
  isConsumer(): boolean {
    const role = this.getCurrentUserRole();
    return role === userRole.CONSUMER;
  }
}
