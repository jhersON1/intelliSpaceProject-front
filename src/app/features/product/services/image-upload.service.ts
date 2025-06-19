import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environments';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TokenService } from 'src/app/auth/services/token.service';
import { API_ROUTES } from 'src/app/core/constants';

export interface ImageUploadResponse {
  images: string[];
}

export interface FileUploadResponse {
  files: string[];
}

export enum TypeRepresentation {
  IMAGE = 'Image',
  MODEL3D = 'Model3D',
  EXPERIENCEAR = 'ExperienceAR',
}

export enum FormatModel3D {
  GLB = '.glb',
  FBX = '.fbx',
  OBJ = '.obj',
  DAE = '.dae',
  USD = '.usd',
  GLTF = '.gltf',
  USDZ = '.usdz',
}

export interface CreateVisualRepresentationDto {
  // Campo común
  productId: string;
  type: TypeRepresentation;
  url?: string;

  // Campo para Image
  altText?: string;
  isPrincipal?: boolean;

  // Campo para Model3D
  format?: FormatModel3D;
  texture?: string;
  scale?: Record<string, number>;
  urlIOS3D?: string;

  // Campo para ExperienceAR
  instructions?: string;
  devicerequirements?: string[];
  urlIOSAR?: string;
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
   * Sube archivos Model3D específicamente a Cloudinary
   * @param files - Array de archivos File de Model3D a subir
   * @returns Observable con las URLs de los archivos subidos
   */  uploadModel3DFiles(files: File[]): Observable<ImageUploadResponse> {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post<ImageUploadResponse>(`${this.baseUrl}${API_ROUTES.POST_IMAGES}`, formData);
  }

  /**
   * Sube archivos ExperienceAR específicamente a Cloudinary
   * @param files - Array de archivos File de ExperienceAR a subir
   * @returns Observable con las URLs de los archivos subidos
   */
  uploadExperienceARFiles(files: File[]): Observable<ImageUploadResponse> {
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
    });    const url = `${this.baseUrl}${API_ROUTES.POST_VISUAL_REPRESENTATION}`;
    
    return this.http.post<any>(url, visualRepresentation, { headers });
  }
}
