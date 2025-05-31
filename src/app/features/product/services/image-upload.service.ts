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
   */
  uploadModel3DFiles(files: File[]): Observable<ImageUploadResponse> {
    console.log('🎯 ImageUploadService.uploadModel3DFiles - Subiendo', files.length, 'archivos Model3D');
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
    console.log('🚀 ImageUploadService.uploadExperienceARFiles - Subiendo', files.length, 'archivos ExperienceAR');
    const formData = new FormData();

    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post<ImageUploadResponse>(`${this.baseUrl}${API_ROUTES.POST_IMAGES}`, formData);
  }

  /**
 * Sube múltiples archivos 3D/AR a Cloudinary
 * @param files - Array de archivos File a subir
 * @returns Observable con las URLs de los archivos subidos
 * @deprecated Use uploadModel3DFiles or uploadExperienceARFiles instead
 */
  uploadMultiple3DFiles(files: File[]): Observable<FileUploadResponse> {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post<FileUploadResponse>(`${this.baseUrl}${API_ROUTES.POST_IMAGES}`, formData);
  }
  /**
 * Crea una representación visual para un producto: Imagen, 3D o AR
 */
  createVisualRepresentation(visualRepresentation: CreateVisualRepresentationDto): Observable<any> {
    console.log('🔧 ImageUploadService.createVisualRepresentation iniciado');
    console.log('📦 Datos a enviar:', visualRepresentation);
    
    const token = this.tokenService.getToken();
    console.log('🔑 Token obtenido:', token ? 'SÍ' : 'NO');
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    console.log('📋 Headers preparados:', headers.keys());

    const url = `${this.baseUrl}${API_ROUTES.POST_VISUAL_REPRESENTATION}`;
    console.log('🌐 URL del endpoint:', url);
      console.log('🚀 Enviando petición HTTP POST...');
    return this.http.post<any>(url, visualRepresentation, { headers }).pipe(
      tap({
        next: (response: any) => {
          console.log('✅ Respuesta exitosa del backend:', response);
        },
        error: (error: any) => {
          console.error('❌ Error en la petición:', error);
          console.error('❌ Status:', error.status);
          console.error('❌ Error body:', error.error);
          console.error('❌ Headers de respuesta:', error.headers);
        }
      })
    );
  }
}
