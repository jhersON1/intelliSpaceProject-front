import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environments';
import { Observable } from 'rxjs';
import { TokenService } from 'src/app/auth/services/token.service';
import { API_ROUTES } from 'src/app/core/constants';

export interface ImageUploadResponse {
  images: string[];
}

export interface CreateVisualRepresentationDto {
  productId: string;
  type: string;
  url: string;
  altText: string;
  isPrincipal: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {
  private http = inject(HttpClient);
  private readonly baseUrl: string = environment.baseUrl;
  private readonly tokenService = inject(TokenService);

  /**
   * Sube múltiples imágenes a Cloudinary
   * @param files - Array de archivos File a subir
   * @returns Observable con las URLs de las imágenes subidas
   */
  uploadMultipleImages(files: File[]): Observable<ImageUploadResponse> {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post<ImageUploadResponse>(`${this.baseUrl}${API_ROUTES.POST_IMAGES}`, formData);
  }

  /**
 * Crea una representación visual para un producto: Imagen, 3D o AR
 */
  createVisualRepresentation(visualRepresentation: CreateVisualRepresentationDto): Observable<any> {
    const token = this.tokenService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<any>(`${this.baseUrl}${API_ROUTES.POST_VISUAL_REPRESENTATION}`, visualRepresentation, { headers });
  }
}
