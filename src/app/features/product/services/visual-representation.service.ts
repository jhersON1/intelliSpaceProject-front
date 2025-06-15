import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environments';
import { catchError, EMPTY, Observable, of, throwError } from 'rxjs';
import { VisualRepresentation } from '../interfaces/visual-representation.interface';
import { TokenService } from 'src/app/auth/services/token.service';
import { AuthService } from 'src/app/auth/services/auth.service';
import { API_ROUTES } from 'src/app/core/constants';

@Injectable({
  providedIn: 'root'
})
export class VisualRepresentationService {
  private http = inject(HttpClient);
  private readonly baseUrl: string = environment.baseUrl;
  private readonly tokenService = inject(TokenService);
  private readonly authService = inject(AuthService);
  public findPrincipalImage(productId: string): Observable<VisualRepresentation> {
    if (!productId) {
      return EMPTY;
    }

    return this.http.get<VisualRepresentation>(`${this.baseUrl}${API_ROUTES.GET_PRINCIPAL_IMAGE}/${productId}`)
      .pipe(
        catchError(error => {
          console.warn('Error cargando imagen principal:', error);
          return EMPTY;
        })
      );
  }

  public findAllImages(productId: string): Observable<VisualRepresentation[]> {
    if (!productId) {
      return of([]);
    }

    return this.http.get<VisualRepresentation[]>(`${this.baseUrl}${API_ROUTES.GET_ALL_IMAGES}/${productId}`)
      .pipe(
        catchError(error => {
          console.warn('Error cargando imágenes:', error);
          return of([]);
        })
      );
  }
  public deleteVisualRepresentation(id: string) {
    if (!id || !this.authService.isAuthenticated()) {
      return throwError(() => new Error('No autenticado o ID inválido'));
    }

    const token = this.tokenService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    return this.http.delete(`${this.baseUrl}${API_ROUTES.DELETE_VISUAL_REPRESENTATION}/${id}`, { headers })
      .pipe(
        catchError(error => {
          console.warn('Error eliminando representación visual:', error);
          return throwError(() => error);
        })
      );
  }
}
