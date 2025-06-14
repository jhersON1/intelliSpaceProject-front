import { Injectable, inject, DestroyRef } from '@angular/core';
import { Observable, map, catchError, throwError, of, tap } from 'rxjs';
import { User, AuthStatus, LoginResponse, CheckTokenResponse, CreateUser } from '../interfaces';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ErrorHandlingService } from './error-handling-service.service';
import { TokenService } from './token.service';
import { AuthStateService } from './auth-state.service';
import { AuthHttpService } from './auth-http.service';
import { LoggerService } from '../../core/services/logger.service';

/**
 * Servicio principal de autenticación que coordina las operaciones
 * Actúa como facade para los servicios especializados
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly errorHandler = inject(ErrorHandlingService);
  private readonly tokenService = inject(TokenService);
  private readonly authState = inject(AuthStateService);
  private readonly authHttp = inject(AuthHttpService);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);

  // Exponer propiedades del estado
  public readonly currentUser = this.authState.currentUser;
  public readonly authStatus = this.authState.authStatus;
  public readonly isAuthenticated = this.authState.isAuthenticated;

  constructor() {
    this.checkAuthStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }
  /**
   * Establece la autenticación del usuario
   */
  private setAuthentication(user: User, token: string): boolean {
    this.logger.info('Estableciendo autenticación de usuario', { userId: user.id }, 'AuthService');
    this.authState.setAuthenticatedUser(user);
    this.tokenService.setToken(token);
    return true;
  }  /**
   * Realiza el login del usuario
   */
  public login(email: string, password: string): Observable<boolean> {
    this.logger.info('Iniciando login', { email }, 'AuthService.login');
    
    return this.authHttp.login(email, password).pipe(
      tap((response) => {
        this.logger.debug('Respuesta de login recibida', { 
          id: response?.id || 'undefined', 
          email: response?.email || 'undefined',
          role: response?.role || 'undefined',
          token: response?.token ? 'present' : 'missing' 
        }, 'AuthService.login');
      }),
      map((response) => {
        if (!response?.id || !response?.email || !response?.token) {
          this.logger.error('Respuesta de login inválida', { 
            hasId: !!response?.id, 
            hasEmail: !!response?.email,
            hasRole: !!response?.role,
            hasToken: !!response?.token 
          }, 'AuthService.login');
          throw new Error('Respuesta de login inválida');
        }
        
        // Crear objeto User desde la respuesta
        const user: User = {
          id: response.id,
          email: response.email,
          role: response.role
        };
        
        return this.setAuthentication(user, response.token);
      }),
      catchError((err) => {
        this.logger.error('Error en login', { 
          email, 
          error: err.message || err 
        }, 'AuthService.login');
        this.errorHandler.handleError(err);
        return throwError(() => new Error(err.error?.message || err.message || 'Error en el login'));
      })
    );
  }

  /**
   * Registra un nuevo usuario
   */
  public register(userData: CreateUser): Observable<boolean> {
    return this.authHttp.register(userData).pipe(
      tap((response) => {
        this.logger.info('Usuario registrado exitosamente', { email: userData.email }, 'AuthService');
      }),
      map(() => true),
      catchError(err => throwError(() => err.error.message))
    );
  }

  /**
   * Verifica el estado de autenticación actual
   */
  public checkAuthStatus(): Observable<boolean> {
    const token = this.tokenService.getToken();

    if (!token) {
      this.logout();
      return of(false);
    }

    return this.authHttp.checkToken().pipe(
      map(({ user, token }) => this.setAuthentication(user, token)),
      catchError(() => {
        this.authState.clearAuthState();
        return of(false);
      })
    );
  }

  /**
   * Cierra la sesión del usuario
   */
  public logout(): void {
    this.logger.info('Cerrando sesión de usuario', {}, 'AuthService');
    this.tokenService.removeToken();
    this.authState.clearAuthState();
  }

  /**
   * Verifica si el usuario actual es vendor
   */
  public isVendor(): boolean {
    return this.authState.isVendor();
  }

  /**
   * Verifica si el usuario actual es consumer
   */
  public isConsumer(): boolean {
    return this.authState.isConsumer();
  }
}
