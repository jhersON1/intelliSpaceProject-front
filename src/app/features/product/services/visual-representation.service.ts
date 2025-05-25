import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environments';
import { catchError, EMPTY, Observable, of, throwError } from 'rxjs';
import { VisualRepresentation } from '../interfaces/visual-representation.interface';
import { TokenService } from 'src/app/auth/services/token.service';
import { API_ROUTES } from 'src/app/core/constants';

@Injectable({
  providedIn: 'root'
})
export class VisualRepresentationService {
  private http = inject(HttpClient);
  private readonly baseUrl: string = environment.baseUrl;
  private readonly tokenService = inject(TokenService);

  public findPrincipalImage(productId: string): Observable<VisualRepresentation> {

    return this.http.get<VisualRepresentation>(`${this.baseUrl}${API_ROUTES.GET_PRINCIPAL_IMAGE}/${productId}`);
  }

  public findAllImages(productId: string): Observable<VisualRepresentation[]> {
    return this.http.get<VisualRepresentation[]>(`${this.baseUrl}${API_ROUTES.GET_ALL_IMAGES}/${productId}`);
  }

  public deleteVisualRepresentation(id: string) {
    const token = this.tokenService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    return this.http.delete(`${this.baseUrl}${API_ROUTES.DELETE_VISUAL_REPRESENTATION}/${id}`, { headers });
  }
}
