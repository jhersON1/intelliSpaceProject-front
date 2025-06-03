import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { ImageUploadService, CreateVisualRepresentationDto, TypeRepresentation, FormatModel3D } from '../../../services/image-upload.service';
import { ARFileManagerService, ARFile } from './ar-file-manager.service';

@Injectable({
  providedIn: 'root'
})
export class VisualRepresentationService {
  private imageUploadService = inject(ImageUploadService);
  private arFileManager = inject(ARFileManagerService);

  /**
   * Crea todas las representaciones visuales para un producto
   */
  createAllVisualRepresentations(
    productId: string, 
    imageUrls: string[], 
    model3DUrls: string[], 
    experienceARUrls: string[]
  ): Observable<any[]> {
    console.log('🔧 VisualRepresentationService.createAllVisualRepresentations iniciado');
    console.log('📦 ProductID:', productId);
    console.log('🖼️ ImageUrls recibidas:', imageUrls);
    console.log('🎯 Model3DUrls recibidas:', model3DUrls);
    console.log('🚀 ExperienceARUrls recibidas:', experienceARUrls);
    
    const requests: Observable<any>[] = [];

    // Agregar requests de imágenes
    if (imageUrls.length > 0) {
      console.log('📸 Procesando imágenes...');
      const imageRequests = this.createImageVisualRepresentations(productId, imageUrls);
      requests.push(...imageRequests);
      console.log('📸 Requests de imágenes agregados:', imageRequests.length);
    } else {
      console.log('ℹ️ No hay imágenes para procesar');
    }

    // Agregar requests de archivos Model3D
    if (model3DUrls.length > 0) {
      console.log('🎯 Procesando archivos Model3D...');
      const model3DRequests = this.createModel3DVisualRepresentations(productId, model3DUrls);
      requests.push(...model3DRequests);
      console.log('🎯 Requests de Model3D agregados:', model3DRequests.length);
    } else {
      console.log('ℹ️ No hay archivos Model3D para procesar');
    }

    // Agregar requests de archivos ExperienceAR
    if (experienceARUrls.length > 0) {
      console.log('🚀 Procesando archivos ExperienceAR...');
      const experienceARRequests = this.createExperienceARVisualRepresentations(productId, experienceARUrls);
      requests.push(...experienceARRequests);
      console.log('🚀 Requests de ExperienceAR agregados:', experienceARRequests.length);
    } else {
      console.log('ℹ️ No hay archivos ExperienceAR para procesar');
    }

    console.log('📋 Total requests a enviar:', requests.length);
    
    if (requests.length > 0) {
      console.log('🚀 Enviando requests al backend...');
      return forkJoin(requests);
    } else {
      console.log('ℹ️ No hay requests para enviar');
      return of([]);
    }
  }

  /**
   * Crea las representaciones visuales para imágenes
   */
  private createImageVisualRepresentations(productId: string, imageUrls: string[]): Observable<any>[] {
    return imageUrls.map((url, index) => {
      const visualRepresentation: CreateVisualRepresentationDto = {
        productId: productId,
        type: TypeRepresentation.IMAGE,
        url: url,
        altText: `Imagen ${index + 1} del producto`,
        isPrincipal: index === 0
      };
      console.log('📸 Creando request de imagen:', visualRepresentation);
      return this.imageUploadService.createVisualRepresentation(visualRepresentation);
    });
  }

  /**
   * Crea las representaciones visuales para archivos Model3D
   */
  private createModel3DVisualRepresentations(productId: string, model3DUrls: string[]): Observable<any>[] {
    const requests: Observable<any>[] = [];
    const arFiles = this.arFileManager.currentARFiles();
    
    console.log('🎯 createModel3DVisualRepresentations - productId:', productId);
    console.log('📁 URLs de Model3D recibidas:', model3DUrls);
    console.log('🗂️ Estado de archivos Model3D:', arFiles.model3D);

    if (model3DUrls.length > 0) {
      let urlIndex = 0;
      const androidUrl = arFiles.model3D.android ? model3DUrls[urlIndex++] : undefined;
      const iosUrl = arFiles.model3D.ios ? model3DUrls[urlIndex++] : undefined;
      
      if (androidUrl || iosUrl) {
        const model3DData: CreateVisualRepresentationDto = {
          productId: productId,
          type: TypeRepresentation.MODEL3D,
          url: androidUrl,                                    // URL para Android (.glb)
          urlIOS3D: iosUrl,                                  // URL para iOS (.usdz)
          format: this.getFormatFromFile(arFiles.model3D.android || arFiles.model3D.ios),
          texture: undefined,                                 // Opcional
          scale: { x: 1, y: 1, z: 1 }                        // Escala por defecto
        };
        console.log('🚀 Creando Visual Representation para Model3D:', model3DData);
        requests.push(this.imageUploadService.createVisualRepresentation(model3DData));
      }
    }

    console.log('📝 Total requests de Model3D a enviar:', requests.length);
    return requests;
  }

  /**
   * Crea las representaciones visuales para archivos ExperienceAR
   */
  private createExperienceARVisualRepresentations(productId: string, experienceARUrls: string[]): Observable<any>[] {
    const requests: Observable<any>[] = [];
    const arFiles = this.arFileManager.currentARFiles();
    
    console.log('🚀 createExperienceARVisualRepresentations - productId:', productId);
    console.log('📁 URLs de ExperienceAR recibidas:', experienceARUrls);
    console.log('🗂️ Estado de archivos ExperienceAR:', arFiles.experienceAR);

    if (experienceARUrls.length > 0) {
      let urlIndex = 0;
      const androidUrl = arFiles.experienceAR.android ? experienceARUrls[urlIndex++] : undefined;
      const iosUrl = arFiles.experienceAR.ios ? experienceARUrls[urlIndex++] : undefined;
      
      if (androidUrl || iosUrl) {
        const experienceARData: CreateVisualRepresentationDto = {
          productId: productId,
          type: TypeRepresentation.EXPERIENCEAR,
          url: androidUrl,                              
          urlIOSAR: iosUrl,
          instructions: 'Experiencia de realidad aumentada del producto',
          devicerequirements: ['ARCore', 'ARKit']
        };
        console.log('🚀 Creando Visual Representation para ExperienceAR:', experienceARData);
        requests.push(this.imageUploadService.createVisualRepresentation(experienceARData));
      }
    }

    console.log('📝 Total requests de ExperienceAR a enviar:', requests.length);
    return requests;
  }

  /**
   * Obtiene el formato del archivo basado en su extensión
   */
  private getFormatFromFile(arFile: ARFile | null): FormatModel3D {
    if (!arFile) return FormatModel3D.GLB;
    
    const format = arFile.format.toLowerCase();
    switch (format) {
      case 'glb': return FormatModel3D.GLB;
      case 'gltf': return FormatModel3D.GLTF;
      case 'usdz': return FormatModel3D.USDZ;
      case 'fbx': return FormatModel3D.FBX;
      case 'obj': return FormatModel3D.OBJ;
      case 'dae': return FormatModel3D.DAE;
      case 'usd': return FormatModel3D.USD;
      default: return FormatModel3D.GLB;
    }
  }
}
