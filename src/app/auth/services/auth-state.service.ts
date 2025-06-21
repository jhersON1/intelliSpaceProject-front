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
    const result = user && user.role === 'VENDOR'; // Comparar con string directamente
    
    // Debug logging temporal - información más detallada
    console.log('AuthStateService isVendor computed:', { 
      user: user ? { 
        id: user.id, 
        role: user.role, 
        roleType: typeof user.role,
        roleValue: JSON.stringify(user.role)
      } : null,
      targetRole: 'VENDOR',
      comparison: user ? `'${user.role}' === 'VENDOR'` : 'no user',
      result 
    });
    
    return !!result;
  });
    public readonly isConsumer = computed(() => {
    const user = this._currentUser();
    if (!user || !user.role) {
      return false;
    }
    return user.role === 'CONSUMER'; // Comparar con string directamente
  });
  /**
   * Establece el usuario autenticado y cambia el estado a autenticado
   */
  setAuthenticatedUser(user: User): void {
    console.log('AuthStateService: Setting authenticated user:', { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    });
    
    this.logger.debug('Estableciendo usuario autenticado', { userId: user.id }, 'AuthStateService');
    this._currentUser.set(user);
    this._authStatus.set(AuthStatus.authenticated);
    
    // Verificar inmediatamente después de setear
    console.log('AuthStateService: State after setting user:', {
      currentUser: this._currentUser(),
      authStatus: this._authStatus(),
      isAuthenticated: this.isAuthenticated(),
      isVendor: this.isVendor()
    });
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
   * Obtiene el rol del usuario actual de forma segura
   * Evita llamadas innecesarias al TokenDecoderService
   */
  getCurrentUserRole(): userRole | null {
    const user = this._currentUser();
    if (user && user.role) {
      return user.role as userRole;
    }
    
    // Solo consultar el token si hay un usuario y no se conoce el rol
    if (this._authStatus() === AuthStatus.authenticated) {
      return this.tokenDecoder.getUserRoleFromToken();
    }
    
    return null;
  }
}
