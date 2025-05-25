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

  public findPrincipalImage(productId: string): Observable<VisualRepresentation> {

    return this.http.get<VisualRepresentation>(`${this.baseUrl}${API_ROUTES.GET_PRINCIPAL_IMAGE}/${productId}`);
  }

}
