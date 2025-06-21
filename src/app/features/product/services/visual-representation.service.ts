import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environments';
import { catchError, Observable, of, throwError } from 'rxjs';
import { VisualRepresentation } from '../interfaces/visual-representation.interface';
import { TokenService } from 'src/app/auth/services/token.service';
import { AuthService } from 'src/app/auth/services/auth.service';
import { API_ROUTES } from 'src/app/core/constants';
import { LoggerService } from 'src/app/core/services';

@Injectable({
  providedIn: 'root'
})
export class VisualRepresentationService {
  private http = inject(HttpClient);
  private readonly baseUrl: string = environment.baseUrl;
  private readonly tokenService = inject(TokenService);
  private readonly authService = inject(AuthService);
  private readonly logger = inject(LoggerService);
  public findPrincipalImage(productId: string): Observable<VisualRepresentation | null> {
    if (!productId) {
      this.logger.warn('productId no proporcionado para findPrincipalImage');
      return of(null);
    }

    return this.http.get<VisualRepresentation>(`${this.baseUrl}${API_ROUTES.GET_PRINCIPAL_IMAGE}/${productId}`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          // Solo loguear como debug si es 404 (no encontrado), que es normal
          if (error.status === 404) {
            this.logger.debug('Producto sin imagen principal', { productId });
          } else {
            this.logger.warn('Error cargando imagen principal', { 
              productId, 
              status: error.status, 
              message: error.message 
            });
          }
          return of(null);
        })
      );
  }  public findAllImages(productId: string): Observable<VisualRepresentation[]> {
    if (!productId) {
      this.logger.warn('productId no proporcionado para findAllImages');
      return of([]);
    }

    return this.http.get<VisualRepresentation[]>(`${this.baseUrl}${API_ROUTES.GET_ALL_IMAGES}/${productId}`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          // Solo loguear como debug si es 404 (no encontrado), que es normal
          if (error.status === 404) {
            this.logger.debug('Producto sin imágenes', { productId });
          } else {
            this.logger.warn('Error cargando todas las imágenes', { 
              productId, 
              status: error.status, 
              message: error.message 
            });
          }
          return of([]);
        })
      );
  }  public deleteVisualRepresentation(id: string) {
    if (!id || !this.authService.isAuthenticated()) {
      const error = new Error('No autenticado o ID inválido');
      this.logger.error('Error en deleteVisualRepresentation', error);
      return throwError(() => error);
    }

    const token = this.tokenService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    return this.http.delete(`${this.baseUrl}${API_ROUTES.DELETE_VISUAL_REPRESENTATION}/${id}`, { headers })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.logger.error('Error eliminando representación visual', { 
            id, 
            status: error.status, 
            message: error.message 
          });
          return throwError(() => error);
        })
      );
  }
}
