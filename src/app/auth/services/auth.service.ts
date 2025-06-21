import { Injectable, inject, DestroyRef } from '@angular/core';
import { Observable, map, catchError, throwError, of, tap } from 'rxjs';
import { User, AuthStatus, LoginResponse, CheckTokenResponse, CreateUser, userRole } from '../interfaces';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ErrorHandlingService } from './error-handling-service.service';
import { TokenService } from './token.service';
import { AuthStateService } from './auth-state.service';
import { AuthHttpService } from './auth-http.service';
import { TokenDecoderService } from './token-decoder.service';
import { LoggerService } from '../../core/services/logger.service';
import { GlobalCleanupService } from '../../core/services/global-cleanup.service';

/**
 * Servicio principal de autenticación que coordina las operaciones
 * Actúa como facade para los servicios especializados
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {  private readonly errorHandler = inject(ErrorHandlingService);
  private readonly tokenService = inject(TokenService);  private readonly authState = inject(AuthStateService);
  private readonly authHttp = inject(AuthHttpService);
  private readonly tokenDecoder = inject(TokenDecoderService);
  private readonly globalCleanup = inject(GlobalCleanupService);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);
  // Exponer propiedades del estado como computed signals
  public readonly currentUser = this.authState.currentUser;
  public readonly authStatus = this.authState.authStatus;
  public readonly isAuthenticated = this.authState.isAuthenticated;
  public readonly isVendor = this.authState.isVendor;
  public readonly isConsumer = this.authState.isConsumer;  constructor() {
    // Inicialización inmediata pero segura
    this.initializeAuthState();
  }
  
  /**
   * Inicializa el estado de autenticación de forma segura
   */
  private initializeAuthState(): void {
    try {
      const token = this.tokenService.getToken();
      
      if (!token) {
        this.logger.debug('No hay token, estableciendo estado como no autenticado', {}, 'AuthService');
        this.authState.clearAuthState();
        return;
      }

      // Verificar si el token ha expirado
      if (this.tokenDecoder.isTokenExpired()) {
        this.logger.info('Token expirado en inicialización, limpiando estado', {}, 'AuthService');
        this.authState.clearAuthState();
        this.tokenService.removeToken();
        return;
      }

      // Intentar obtener información del usuario desde el token local
      const userInfo = this.tokenDecoder.getUserInfoFromToken();
      if (userInfo) {
        const user: User = {
          id: userInfo.id,
          email: userInfo.email,
          role: userInfo.rol
        };
        
        this.authState.setAuthenticatedUser(user);
        this.logger.debug('Estado de autenticación inicializado desde token', { userId: user.id }, 'AuthService');
      } else {
        this.logger.info('No se pudo obtener información del usuario desde token, limpiando estado', {}, 'AuthService');
        this.authState.clearAuthState();
        this.tokenService.removeToken();
      }
    } catch (error) {
      this.logger.error('Error inicializando estado de autenticación', { error }, 'AuthService');
      this.authState.clearAuthState();
      this.tokenService.removeToken();
    }
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
        }        console.log('AuthService: Raw login response:', {
          response: response,
          hasRole: 'role' in response,
          roleValue: response.role,
          roleType: typeof response.role,
          allKeys: Object.keys(response || {})
        });

        // Crear objeto User desde la respuesta (manteniendo el tipo string)
        // Usar 'VENDOR' como default si no viene rol (para testing)
        const user: User = {
          id: response.id,
          email: response.email,
          role: response.role || 'VENDOR' // Default a VENDOR para testing
        };
        
        console.log('AuthService: Created user object:', {
          user: user,
          isVendorCheck: user.role === 'VENDOR'
        });
        
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
  }  /**
   * Verifica el estado de autenticación actual
   */
  public checkAuthStatus(): Observable<boolean> {
    const token = this.tokenService.getToken();

    if (!token) {
      this.logger.debug('No hay token, usuario no autenticado', {}, 'AuthService.checkAuthStatus');
      this.authState.clearAuthState();
      return of(false);
    }

    // Verificar si el token ha expirado
    if (this.tokenDecoder.isTokenExpired()) {
      this.logger.warn('Token expirado durante verificación', {}, 'AuthService.checkAuthStatus');
      this.authState.clearAuthState();
      this.tokenService.removeToken();
      return of(false);
    }

    // Intentar obtener información del usuario desde el token local
    const userInfo = this.tokenDecoder.getUserInfoFromToken();
    if (userInfo) {
      const user: User = {
        id: userInfo.id,
        email: userInfo.email,
        role: userInfo.rol
      };
      
      this.logger.debug('Usuario autenticado desde token local', { 
        userId: user.id, 
        role: user.role 
      }, 'AuthService.checkAuthStatus');
      
      this.setAuthentication(user, token);
      return of(true);
    }

    // Si no se puede obtener info del token local, verificar con el backend
    this.logger.debug('Verificando token con el backend', {}, 'AuthService.checkAuthStatus');
    return this.authHttp.checkToken().pipe(
      map(({ user, token: newToken }) => {
        this.logger.info('Token verificado exitosamente con el backend', { userId: user.id }, 'AuthService.checkAuthStatus');
        return this.setAuthentication(user, newToken || token);
      }),
      catchError((error) => {
        this.logger.warn('Error verificando token con el backend', { error: error.message }, 'AuthService.checkAuthStatus');
        this.authState.clearAuthState();
        this.tokenService.removeToken();
        return of(false);
      })
    );
  }/**
   * Cierra la sesión del usuario
   */
  public logout(): void {
    this.logger.info('Iniciando proceso de logout', {}, 'AuthService');
    
    // Ejecutar limpieza global antes de limpiar el estado
    this.globalCleanup.executeCleanup();
    
    // Limpiar tokens y estado de autenticación
    this.tokenService.removeToken();
    this.authState.clearAuthState();
    
    this.logger.info('Logout completado exitosamente', {}, 'AuthService');
  }
}
