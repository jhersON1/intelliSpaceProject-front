import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';
import { ExperienceARResponse, Model3D, Model3DResponse } from '../interfaces/model-3d.interface';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environments';
import { API_ROUTES } from 'src/app/core/constants';

@Injectable({
  providedIn: 'root'
})
export class Model3DService {

  // Mapeo estático de productos a modelos 3D (solo uno por producto)
  private staticModels: { [productId: string]: Model3D } = {
    '8fa31403-3d9e-4dc9-bb6f-53e723e8cb08': {
      productId: '8fa31403-3d9e-4dc9-bb6f-53e723e8cb08',
      type: 'Model3D',
      url: '/models/OfficeChair.glb',
      format: '.glb',
      altText: 'Modelo 3D OfficeChair',
      isPrincipal: true,
      scale: { x: 1.0, y: 1.0, z: 1.0 }
    },
    '2': {
      productId: '2',
      type: 'Model3D',
      url: '/models/car.glb',
      format: '.glb',
      altText: 'Modelo 3D Auto',
      isPrincipal: true,
      scale: { x: 1.0, y: 1.0, z: 1.0 }
    },
    '3': {
      productId: '3',
      type: 'Model3D',
      url: '/models/Car1.glb',
      format: '.glb',
      altText: 'Modelo 3D Car1',
      isPrincipal: true,
      scale: { x: 1.0, y: 1.0, z: 1.0 }
    },
    '4': {
      productId: '4',
      type: 'Model3D',
      url: '/models/OfficeChair.glb',
      format: '.glb',
      altText: 'Modelo 3D Silla de Oficina',
      isPrincipal: true,
      scale: { x: 1.0, y: 1.0, z: 1.0 }
    }
  };

  /**
   * Obtiene el modelo 3D único para un producto específico
   * Retorna null si no existe modelo para ese producto
   */  getProductModel(productId: string): Observable<Model3D | null> {
    const model = this.staticModels[productId] || null;
    return of(model);
  }

  /**
   * Obtiene la URL del modelo iOS (USDZ) para un producto específico
   */
  getIOSModelUrl(productId: string): string {
    const iosModels: { [productId: string]: string } = {
      '1': './models/bugatti.usdz',
      '2': './models/car.usdz',
      '3': './models/Car1.usdz',
      '4': './models/OfficeChair.usdz'
    };
    
    return iosModels[productId] || './models/default.usdz';
  }

  /**
   * Verifica si un producto tiene modelo 3D disponible
   */
  hasModel(productId: string): boolean {
    return !!this.staticModels[productId];
  }


  private http = inject(HttpClient);
  private readonly baseUrl: string = environment.baseUrl;

  /**
   * Obtiene el modelo 3D para un producto específico
   */
  getModel3D(productId: string): Observable<Model3DResponse | null> {
    return this.http.get<Model3DResponse>(`${this.baseUrl}${API_ROUTES.GET_MODEL_3D}/${productId}`)
      .pipe(
        catchError(error => {
          return of(null);
        })
      );
  }

  /**
   * Obtiene la experiencia AR para un producto específico
   */
  getExperienceAR(productId: string): Observable<ExperienceARResponse | null> {
    return this.http.get<ExperienceARResponse>(`${this.baseUrl}${API_ROUTES.GET_EXPERIENCE_AR}/${productId}`)
      .pipe(
        catchError(error => {
          return of(null);
        })
      );
  }
}