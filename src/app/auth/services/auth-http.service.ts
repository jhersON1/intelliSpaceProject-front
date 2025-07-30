import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { User, LoginResponse, CheckTokenResponse, CreateUser } from '../interfaces';
import { TokenService } from './token.service';
import { LoggerService } from '../../core/services/logger.service';
import { API_ROUTES } from '../../core/constants';
import { environment } from '@environments/environments';

@Injectable({
  providedIn: 'root'
})
export class AuthHttpService {
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);
  private readonly logger = inject(LoggerService);
  private readonly baseUrl: string = environment.baseUrl;

  login(email: string, password: string): Observable<LoginResponse> {
    const url = `${this.baseUrl}${API_ROUTES.LOGIN}`;
    const body = { email, password };

    this.logger.info('Iniciando proceso de login', { email, url }, 'AuthHttpService.login');    return this.http.post<LoginResponse>(url, body).pipe(
      map((response) => {
        this.logger.debug('Respuesta HTTP de login', { 
          hasId: !!response?.id,
          hasEmail: !!response?.email,
          hasRole: !!response?.role,
          hasToken: !!response?.token,
          userId: response?.id || 'undefined'
        }, 'AuthHttpService.login');
        return response;
      }),
      catchError((error) => {
        this.logger.error('Error en proceso de login', { 
          email, 
          url,
          status: error.status,
          message: error.message,
          errorBody: error.error
        }, 'AuthHttpService.login');
        return throwError(() => error);
      })
    );
  }

  register(userData: CreateUser): Observable<any> {
    const url = `${this.baseUrl}${API_ROUTES.REGISTER}`;

    this.logger.info('Iniciando proceso de registro', { 
      email: userData.email,
      role: userData.rol 
    }, 'AuthHttpService.register');

    return this.http.post(url, userData).pipe(
      catchError((error) => {
        this.logger.error('Error en proceso de registro', {
          email: userData.email,
          status: error.status,
          message: error.message
        }, 'AuthHttpService.register');
        return throwError(() => error.error.message);
      })
    );
  }

  checkToken(): Observable<CheckTokenResponse> {
    const url = `${this.baseUrl}${API_ROUTES.CHECK_TOKEN}`;
    const token = this.tokenService.getToken();

    if (!token) {
      this.logger.warn('No hay token para verificar', {}, 'AuthHttpService.checkToken');
      return throwError(() => new Error('No token available'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.logger.debug('Verificando token', {}, 'AuthHttpService.checkToken');

    return this.http.get<CheckTokenResponse>(url, { headers }).pipe(
      catchError((error) => {
        this.logger.warn('Token inválido o expirado', { 
          status: error.status 
        }, 'AuthHttpService.checkToken');
        return throwError(() => error);
      })
    );
  }
}
