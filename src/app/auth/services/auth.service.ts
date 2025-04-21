import { HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Observable, map, catchError, throwError, of, tap } from 'rxjs';
import { User, AuthStatus, LoginResponse, CheckTokenResponse, CreateUser } from '../interfaces';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ErrorHandlingService } from './error-handling-service.service';
import { TokenService } from './token.service';
import { API_ROUTES } from '../../core/constants';
import { environment } from '../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private http = inject(HttpClient);
  private readonly errorHandler = inject(ErrorHandlingService);
  private readonly tokenService = inject(TokenService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly baseUrl: string = environment.baseUrl;

  private readonly _currentUser = signal<User | null>(null, {
    equal: (a, b) => a?.id === b?.id
  });
  private readonly _authStatus = signal<AuthStatus>(AuthStatus.checking);

  public currentUser = computed(() => this._currentUser());
  public authStatus = computed(() => this._authStatus());

  constructor() {
    this.checkAuthStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private setAuthentication(user: User, token: string): boolean {
    this._currentUser.set(user);
    this._authStatus.set(AuthStatus.authenticated);
    this.tokenService.setToken(token);

    return true;
  }

  public login(email: string, password: string): Observable<boolean> {
    const url = `${this.baseUrl}${API_ROUTES.LOGIN}`;
    const body = { email, password };

    return this.http.post<LoginResponse>(url, body)
      .pipe(
        map(({ user, token }) => this.setAuthentication(user, token)),
        catchError((err) => {
          this.errorHandler.handleError(err);
          return throwError(() => new Error(err.error.message));
        })
      )
  }

  register(body: CreateUser): Observable<boolean> {
    const url = `${this.baseUrl}${API_ROUTES.REGISTER}`;

    return this.http.post(url, body)
      .pipe(
        tap((user) => {
          console.log(user);
        }),
        map(() => true),
        catchError(err => throwError(() => err.error.message)),
      );
  }

  public checkAuthStatus(): Observable<boolean> {
    const url = `${this.baseUrl}${API_ROUTES.CHECK_TOKEN}`;
    const token = this.tokenService.getToken();

    if (!token) {
      this.logout();
      return of(false);
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<CheckTokenResponse>(url, { headers })
      .pipe(
        map(({ user, token }) => this.setAuthentication(user, token)),
        catchError(() => {
          this._authStatus.set(AuthStatus.notAuthenticated);
          return of(false);
        })
      )
  }

  public logout() {
    this.tokenService.removeToken();
    this._currentUser.set(null);
    this._authStatus.set(AuthStatus.notAuthenticated);
  }
}
