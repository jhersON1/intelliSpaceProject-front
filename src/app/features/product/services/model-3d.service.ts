import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Model3D } from '../interfaces/model-3d.interface';

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
   */
  getProductModel(productId: string): Observable<Model3D | null> {
    console.log('Buscando modelo 3D para producto ID:', productId);
    
    const model = this.staticModels[productId] || null;
    
    if (model) {
      console.log('Modelo 3D encontrado:', model);
    } else {
      console.log('No se encontró modelo 3D para el producto:', productId);
    }
    
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
      '8fa31403-3d9e-4dc9-bb6f-53e723e8cb08': './models/OfficeChair.usdz'
    };
    
    return iosModels[productId] || './models/default.usdz';
  }

  /**
   * Verifica si un producto tiene modelo 3D disponible
   */
  hasModel(productId: string): boolean {
    return !!this.staticModels[productId];
  }
}