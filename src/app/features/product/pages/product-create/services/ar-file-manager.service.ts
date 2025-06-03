import { Injectable, signal } from '@angular/core';

/**
 * Interfaz para definir la estructura de un archivo AR seleccionado.
 */
export interface ARFile {
  file: File;
  url: string;
  name: string;
  size: number;
  format: string;
  preview?: string;
  type?: ARFileType;
}

/**
 * Interfaz para los archivos AR organizados por tipo y plataforma.
 */
export interface ARFiles {
  model3D: {
    android: ARFile | null;  // .glb para Android
    ios: ARFile | null;      // .usdz para iOS
  };
  experienceAR: {
    android: ARFile | null;  // .glb para Android  
    ios: ARFile | null;      // .usdz para iOS
  };
}

/**
 * Tipos de archivo AR disponibles.
 */
export enum ARFileType {
  MODEL_3D = 'MODEL_3D',
  EXPERIENCE_AR = 'EXPERIENCE_AR'
}

/**
 * Plataformas soportadas para AR.
 */
export type ARPlatform = 'android' | 'ios';

@Injectable({
  providedIn: 'root'
})
export class ARFileManagerService {
  
  readonly currentARFiles = signal<ARFiles>({
    model3D: { android: null, ios: null },
    experienceAR: { android: null, ios: null }
  });
  
  readonly isUploadingAR = signal<boolean>(false);

  /**
   * Maneja la selección de archivos AR
   */
  onARFileSelected(eventData: { event: Event; type: ARFileType; platform: ARPlatform }): void {
    console.log('🎯 ARFileManagerService.onARFileSelected recibido:', eventData);
    
    const input = eventData.event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    console.log('📁 Archivo en ARFileManagerService:', file?.name, file?.size);
    
    if (!file) return;

    // Crear la representación del archivo AR
    const reader = new FileReader();
    reader.onload = () => {
      const arFile: ARFile = {
        file: file,
        url: reader.result as string,
        name: file.name,
        size: file.size,
        format: file.name.split('.').pop()?.toLowerCase() || ''
      };      // Actualizar el estado de archivos AR
      this.currentARFiles.update(current => {
        const fileType = eventData.type === 'MODEL_3D' ? 'model3D' : 'experienceAR';
        return {
          ...current,
          [fileType]: {
            ...current[fileType],
            [eventData.platform]: arFile
          }
        };
      });
    };
    
    reader.readAsDataURL(file);
    
    // Limpiar el input
    input.value = '';
  }
  /**
   * Maneja la eliminación de archivos AR
   */
  onARFileRemoved(type: ARFileType, platform: ARPlatform): void {
    this.currentARFiles.update(current => {
      const fileType = type === ARFileType.MODEL_3D ? 'model3D' : 'experienceAR';
      return {
        ...current,
        [fileType]: {
          ...current[fileType],
          [platform]: null
        }
      };
    });
  }

  /**
   * Maneja la actualización de archivos AR
   */
  onARFilesUpdated(files: ARFiles): void {
    console.log('🔄 ARFileManagerService.onARFilesUpdated recibido:', files);
    this.currentARFiles.set(files);
  }

  /**
   * Obtiene solo los archivos Model3D para subir
   */
  getModel3DFilesToUpload(): File[] {
    const files: File[] = [];
    const model3DFiles = this.currentARFiles().model3D;
    
    if (model3DFiles.android?.file) {
      files.push(model3DFiles.android.file);
    }
    if (model3DFiles.ios?.file) {
      files.push(model3DFiles.ios.file);
    }
    
    return files;
  }

  /**
   * Obtiene solo los archivos ExperienceAR para subir
   */
  getExperienceARFilesToUpload(): File[] {
    const files: File[] = [];
    const experienceARFiles = this.currentARFiles().experienceAR;
    
    if (experienceARFiles.android?.file) {
      files.push(experienceARFiles.android.file);
    }
    if (experienceARFiles.ios?.file) {
      files.push(experienceARFiles.ios.file);
    }
    
    return files;
  }

  /**
   * Verifica si hay archivos Model3D seleccionados
   */
  hasModel3DFiles(): boolean {
    const model3DFiles = this.currentARFiles().model3D;
    return !!(model3DFiles.android?.file || model3DFiles.ios?.file);
  }

  /**
   * Verifica si hay archivos ExperienceAR seleccionados
   */
  hasExperienceARFiles(): boolean {
    const experienceARFiles = this.currentARFiles().experienceAR;
    return !!(experienceARFiles.android?.file || experienceARFiles.ios?.file);
  }

  /**
   * Establece el estado de carga de archivos AR
   */
  setUploadingState(isUploading: boolean): void {
    this.isUploadingAR.set(isUploading);
  }

  /**
   * Resetea el estado del servicio
   */
  reset(): void {
    this.currentARFiles.set({
      model3D: { android: null, ios: null },
      experienceAR: { android: null, ios: null }
    });
    this.isUploadingAR.set(false);
  }
  /**
   * Maneja la selección de archivos Model3D
   */
  onModel3DFileSelected(event: Event, platform: 'android' | 'ios'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      console.log(`📁 Archivo Model3D seleccionado para ${platform}:`, file.name);
      
      // Validar formato
      const validFormats = platform === 'android' ? ['.glb'] : ['.usdz'];
      const isValidFormat = validFormats.some(format => file.name.toLowerCase().endsWith(format));
      
      if (!isValidFormat) {
        const expectedFormat = platform === 'android' ? 'GLB' : 'USDZ';
        console.error(`El archivo Model3D para ${platform} debe ser formato ${expectedFormat}`);
        return;
      }
      
      // Crear el objeto ARFile
      const arFile: ARFile = {
        file: file,
        url: '',
        name: file.name,
        size: file.size,
        format: file.name.split('.').pop()?.toUpperCase() || '',
        preview: URL.createObjectURL(file),
        type: ARFileType.MODEL_3D
      };
      
      // Actualizar el estado
      const currentFiles = this.currentARFiles();
      if (platform === 'android') {
        currentFiles.model3D.android = arFile;
      } else {
        currentFiles.model3D.ios = arFile;
      }
      this.currentARFiles.set(currentFiles);
      
      console.log(`✅ Archivo Model3D para ${platform} configurado`);
    }
  }

  /**
   * Elimina un archivo Model3D
   */
  removeModel3DFile(platform: 'android' | 'ios'): void {
    console.log(`🗑️ Eliminando archivo Model3D para ${platform}`);
    
    const currentFiles = this.currentARFiles();
    
    if (platform === 'android') {
      if (currentFiles.model3D.android?.preview) {
        URL.revokeObjectURL(currentFiles.model3D.android.preview);
      }
      currentFiles.model3D.android = null;
    } else {
      if (currentFiles.model3D.ios?.preview) {
        URL.revokeObjectURL(currentFiles.model3D.ios.preview);
      }
      currentFiles.model3D.ios = null;
    }
    
    this.currentARFiles.set(currentFiles);
    console.log(`✅ Archivo Model3D para ${platform} eliminado`);
  }

  /**
   * Maneja la selección de archivos ExperienceAR
   */
  onExperienceARFileSelected(event: Event, platform: 'android' | 'ios'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      console.log(`📁 Archivo ExperienceAR seleccionado para ${platform}:`, file.name);
      
      // Crear el objeto ARFile (ExperienceAR no tiene formato específico)
      const arFile: ARFile = {
        file: file,
        url: '',
        name: file.name,
        size: file.size,
        format: file.name.split('.').pop()?.toUpperCase() || '',
        preview: file.name, // Para ExperienceAR mostramos solo el nombre
        type: ARFileType.EXPERIENCE_AR
      };
      
      // Actualizar el estado
      const currentFiles = this.currentARFiles();
      if (platform === 'android') {
        currentFiles.experienceAR.android = arFile;
      } else {
        currentFiles.experienceAR.ios = arFile;
      }
      this.currentARFiles.set(currentFiles);
      
      console.log(`✅ Archivo ExperienceAR para ${platform} configurado`);
    }
  }

  /**
   * Elimina un archivo ExperienceAR
   */
  removeExperienceARFile(platform: 'android' | 'ios'): void {
    console.log(`🗑️ Eliminando archivo ExperienceAR para ${platform}`);
    
    const currentFiles = this.currentARFiles();
    
    if (platform === 'android') {
      currentFiles.experienceAR.android = null;
    } else {
      currentFiles.experienceAR.ios = null;
    }
    
    this.currentARFiles.set(currentFiles);
    console.log(`✅ Archivo ExperienceAR para ${platform} eliminado`);
  }

  /**
   * Limpia todos los archivos AR
   */
  clearARFiles(): void {
    console.log('🗑️ Limpiando todos los archivos AR');
    
    const currentFiles = this.currentARFiles();
    
    // Limpiar URLs de preview para Model3D
    Object.values(currentFiles.model3D).forEach(arFile => {
      if (arFile?.preview && arFile.type === ARFileType.MODEL_3D) {
        URL.revokeObjectURL(arFile.preview);
      }
    });
    
    // Resetear estado
    this.currentARFiles.set({
      model3D: {
        android: null,
        ios: null
      },
      experienceAR: {
        android: null,
        ios: null
      }
    });
    
    console.log('✅ Archivos AR limpiados');
  }
}
