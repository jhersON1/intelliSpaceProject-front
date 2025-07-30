import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, switchMap, tap } from 'rxjs';
import { ImageUploadService, ImageUploadResponse } from '../../../services/image-upload.service';

import { ARFileManagerService } from './ar-file-manager.service';
import { ImageManagerService } from './image-manager.service';

export interface FileUploadResult {
  imageUrls: string[];
  model3DUrls: string[];
  experienceARUrls: string[];
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadOrchestratorService {
  private imageUploadService = inject(ImageUploadService);
  private imageManager = inject(ImageManagerService);
  private arFileManager = inject(ARFileManagerService);

  /**
   * Sube todos los archivos (imágenes, Model3D y ExperienceAR) a Cloudinary por separado
   */
  uploadAllFiles(): Observable<FileUploadResult> {
    const imagesToUpload = this.imageManager.getFilesToUpload();
    const model3DFilesToUpload = this.arFileManager.getModel3DFilesToUpload();
    const experienceARFilesToUpload = this.arFileManager.getExperienceARFilesToUpload();
    
    const hasImages = imagesToUpload.length > 0;
    const hasModel3D = model3DFilesToUpload.length > 0;
    const hasExperienceAR = experienceARFilesToUpload.length > 0;

    if (!hasImages && !hasModel3D && !hasExperienceAR) {
      console.log('⚠️ No hay archivos para subir');
      return of({ imageUrls: [], model3DUrls: [], experienceARUrls: [] });
    } 

    const uploadRequests: Observable<ImageUploadResponse>[] = [];
    
    if (hasImages) {
      console.log('📤 Agregando request de imágenes');
      this.imageManager.setUploadingState(true);
      uploadRequests.push(this.imageUploadService.uploadMultipleImages(imagesToUpload));
    }
    
    if (hasModel3D) {
      console.log('📤 Agregando request de archivos Model3D');
      this.arFileManager.setUploadingState(true);
      uploadRequests.push(this.imageUploadService.uploadModel3DFiles(model3DFilesToUpload));
    }

    if (hasExperienceAR) {
      console.log('📤 Agregando request de archivos ExperienceAR');
      this.arFileManager.setUploadingState(true);
      uploadRequests.push(this.imageUploadService.uploadExperienceARFiles(experienceARFilesToUpload));
    }

    console.log('🚀 Enviando', uploadRequests.length, 'requests de upload a Cloudinary');

    return new Observable<FileUploadResult>(observer => {
      forkJoin(uploadRequests).subscribe({
        next: (responses) => {
          console.log('✅ Respuestas de Cloudinary recibidas:', responses);
          this.imageManager.setUploadingState(false);
          this.arFileManager.setUploadingState(false);
          
          let requestIndex = 0;
          let imageUrls: string[] = [];
          let model3DUrls: string[] = [];
          let experienceARUrls: string[] = [];
          
          if (hasImages) {
            imageUrls = (responses[requestIndex++] as ImageUploadResponse)?.images || [];
            console.log('🖼️ URLs de imágenes procesadas:', imageUrls);
          }
          
          if (hasModel3D) {
            model3DUrls = (responses[requestIndex++] as ImageUploadResponse)?.images || [];
            console.log('🎯 URLs de Model3D procesadas:', model3DUrls);
          }
          
          if (hasExperienceAR) {
            experienceARUrls = (responses[requestIndex++] as ImageUploadResponse)?.images || [];
            console.log('🚀 URLs de ExperienceAR procesadas:', experienceARUrls);
          }
          
          observer.next({ imageUrls, model3DUrls, experienceARUrls });
          observer.complete();
        },
        error: (error) => {
          this.imageManager.setUploadingState(false);
          this.arFileManager.setUploadingState(false);
          console.error('❌ Error en upload de archivos:', error);
          observer.error(error);
        }
      });
    });
  }

  /**
   * Orquesta la subida de archivos y creación de producto
   */
  uploadAllFilesAndCreateProduct(formData: any, images: any[], arFiles: any): Observable<any> {
    console.log('🚀 FileUploadOrchestratorService.uploadAllFilesAndCreateProduct iniciado');
    
    // Obtener archivos para subir
    const imagesToUpload = this.getFilesToUpload(images);
    const model3DFilesToUpload = this.getModel3DFilesToUpload(arFiles);
    const experienceARFilesToUpload = this.getExperienceARFilesToUpload(arFiles);
    
    const hasImages = imagesToUpload.length > 0;
    const hasModel3D = model3DFilesToUpload.length > 0;
    const hasExperienceAR = experienceARFilesToUpload.length > 0;

    console.log('📸 Imágenes a subir:', imagesToUpload.length);
    console.log('🎯 Archivos Model3D a subir:', model3DFilesToUpload.length);
    console.log('🚀 Archivos ExperienceAR a subir:', experienceARFilesToUpload.length);

    if (!hasImages && !hasModel3D && !hasExperienceAR) {
      console.log('⚠️ No hay archivos para subir, creando producto directamente');
      return this.createProductDirectly(formData, [], [], []);
    }

    const uploadRequests: Observable<any>[] = [];

    if (hasImages) {
      uploadRequests.push(this.imageUploadService.uploadMultipleImages(imagesToUpload));
    }

    if (hasModel3D) {
      uploadRequests.push(this.imageUploadService.uploadModel3DFiles(model3DFilesToUpload));
    }

    if (hasExperienceAR) {
      uploadRequests.push(this.imageUploadService.uploadExperienceARFiles(experienceARFilesToUpload));
    }

    return forkJoin(uploadRequests).pipe(
      switchMap((responses: any[]) => {
        console.log('✅ Todos los uploads completados:', responses);
        
        let imageUrls: string[] = [];
        let model3DUrls: string[] = [];
        let experienceARUrls: string[] = [];
        
        let requestIndex = 0;
        
        if (hasImages) {
          imageUrls = responses[requestIndex++]?.images || [];
        }
        
        if (hasModel3D) {
          model3DUrls = responses[requestIndex++]?.images || [];
        }
        
        if (hasExperienceAR) {
          experienceARUrls = responses[requestIndex++]?.images || [];
        }
        
        return this.createProductDirectly(formData, imageUrls, model3DUrls, experienceARUrls);
      })
    );
  }

  /**
   * Crea el producto directamente sin uploads
   */
  private createProductDirectly(formData: any, imageUrls: string[], model3DUrls: string[], experienceARUrls: string[]): Observable<any> {
    return of({
      success: true,
      message: 'Producto creado exitosamente',
      imageUrls,
      model3DUrls,
      experienceARUrls
    });
  }

  /**
   * Obtiene los archivos de imagen que necesitan ser subidos
   */
  private getFilesToUpload(images: any[]): File[] {
    return images.map(imageData => imageData.file).filter(file => file);
  }

  /**
   * Obtiene los archivos Model3D que necesitan ser subidos
   */
  private getModel3DFilesToUpload(arFiles: any): File[] {
    const files: File[] = [];
    
    if (arFiles?.model3D?.android?.file) {
      files.push(arFiles.model3D.android.file);
    }
    
    if (arFiles?.model3D?.ios?.file) {
      files.push(arFiles.model3D.ios.file);
    }
    
    return files;
  }

  /**
   * Obtiene los archivos ExperienceAR que necesitan ser subidos
   */
  private getExperienceARFilesToUpload(arFiles: any): File[] {
    const files: File[] = [];
    
    if (arFiles?.experienceAR?.android?.file) {
      files.push(arFiles.experienceAR.android.file);
    }
    
    if (arFiles?.experienceAR?.ios?.file) {
      files.push(arFiles.experienceAR.ios.file);
    }
    
    return files;
  }

  /**
   * Verifica si hay archivos para subir
   */
  hasFilesToUpload(): boolean {
    return this.imageManager.getFilesToUpload().length > 0 ||
           this.arFileManager.getModel3DFilesToUpload().length > 0 ||
           this.arFileManager.getExperienceARFilesToUpload().length > 0;
  }
}
