import { Injectable, inject, signal, computed } from '@angular/core';
import { User, AuthStatus, userRole } from '../interfaces';
import { LoggerService } from '../../core/services/logger.service';
import { TokenDecoderService } from './token-decoder.service';

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

  public readonly currentUser = computed(() => this._currentUser());
  public readonly authStatus = computed(() => this._authStatus());
  public readonly isAuthenticated = computed(() => this._authStatus() === AuthStatus.authenticated);
  public readonly isChecking = computed(() => this._authStatus() === AuthStatus.checking);  public readonly isVendor = computed(() => {
    const user = this._currentUser();
    const result = user && user.role === 'VENDOR';
    
    return !!result;
  });    public readonly isConsumer = computed(() => {
    const user = this._currentUser();
    if (!user || !user.role) {
      return false;
    }
    return user.role === 'CONSUMER';
  });

  public readonly isAdmin = computed(() => {
    const user = this._currentUser();
    if (!user || !user.role) {
      return false;
    }
    return user.role === 'ADMIN';
  });

  setAuthenticatedUser(user: User): void {
    console.log('AuthStateService: Setting authenticated user:', { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    });
    
    this.logger.debug('Estableciendo usuario autenticado', { userId: user.id }, 'AuthStateService');
    this._currentUser.set(user);
    this._authStatus.set(AuthStatus.authenticated);
  }

  clearAuthState(): void {
    this.logger.debug('Limpiando estado de autenticación', {}, 'AuthStateService');
    this._currentUser.set(null);
    this._authStatus.set(AuthStatus.notAuthenticated);
  }
  
  setCheckingStatus(): void {
    this._authStatus.set(AuthStatus.checking);
  }

  getCurrentUserRole(): userRole | null {
    const user = this._currentUser();
    if (user && user.role) {
      return user.role as userRole;
    }

    if (this._authStatus() === AuthStatus.authenticated) {
      return this.tokenDecoder.getUserRoleFromToken();
    }
    
    return null;
  }
}
