import { Injectable, signal, computed } from '@angular/core';
import { FormArray, FormBuilder, FormControl } from '@angular/forms';

export interface ImagePreview {
  name: string;
  url: string | ArrayBuffer;
  file?: File;
}

@Injectable({
  providedIn: 'root'
})
export class ImageManagerService {
  private fb = new FormBuilder();

  readonly images = signal<ImagePreview[]>([]);
  readonly selectedImageIndex = signal<number>(-1);
  readonly isUploadingImages = signal<boolean>(false);

  readonly selectedImage = computed(() => {
    const index = this.selectedImageIndex();
    const allImages = this.images();
    return index >= 0 && index < allImages.length ? allImages[index] : null;
  });

  /**
   * Maneja la selección de archivos de imagen
   */
  onFileSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;

    this.processSelectedFiles(files);
    this.resetFileInput(event.target as HTMLInputElement);
  }

  /**
   * Procesa los archivos seleccionados
   */
  private processSelectedFiles(files: FileList): void {
    Array.from(files).forEach(file => {
      this.readFileAsDataURL(file);
    });
  }

  /**
   * Lee el archivo como Data URL para mostrar preview
   */
  private readFileAsDataURL(file: File): void {
    const reader = new FileReader();

    reader.onload = () => {
      if (reader.result) {
        this.addImagePreview(file.name, reader.result, file);
      }
    };

    reader.readAsDataURL(file);
  }

  /**
   * Agrega una nueva imagen al preview
   */
  private addImagePreview(fileName: string, url: string | ArrayBuffer, file: File): void {
    this.images.update(currentImages => [
      ...currentImages,
      { name: fileName, url, file }
    ]);

    this.selectedImageIndex.set(this.images().length - 1);
  }

  /**
   * Resetea el input de archivo
   */
  private resetFileInput(input: HTMLInputElement): void {
    input.value = '';
  }

  /**
   * Selecciona una imagen por índice
   */
  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  /**
   * Remueve una imagen por índice
   */
  removeImage(index: number): void {
    const currentImages = [...this.images()];
    const currentSelectedIndex = this.selectedImageIndex();

    currentImages.splice(index, 1);
    this.images.set(currentImages);

    this.updateSelectedIndexAfterRemoval(index, currentSelectedIndex, currentImages.length);
  }

  /**
   * Actualiza el índice seleccionado después de remover una imagen
   */
  private updateSelectedIndexAfterRemoval(removedIndex: number, currentSelectedIndex: number, remainingImagesCount: number): void {
    if (currentSelectedIndex === removedIndex) {
      this.selectedImageIndex.set(remainingImagesCount > 0 ? 0 : -1);
    } else if (currentSelectedIndex > removedIndex) {
      this.selectedImageIndex.update(idx => idx - 1);
    }
  }

  /**
   * Sincroniza las imágenes con el FormArray
   */
  syncImagesWithFormArray(imageArray: FormArray): void {
    this.clearFormArray(imageArray);

    this.images().forEach(img => {
      if (imageArray) {
        imageArray.push(this.fb.control(img.name));
      }
    });
  }

  /**
   * Limpia el FormArray
   */
  private clearFormArray(imageArray: FormArray): void {
    if (imageArray) {
      while (imageArray.length) {
        imageArray.removeAt(0);
      }
    }
  }

  /**
   * Obtiene los archivos File que necesitan ser subidos
   */
  getFilesToUpload(): File[] {
    return this.images()
      .map(img => img.file)
      .filter((file): file is File => file instanceof File);
  }

  /**
   * Resetea el estado del servicio
   */
  reset(): void {
    this.images.set([]);
    this.selectedImageIndex.set(-1);
    this.isUploadingImages.set(false);
  }

  /**
   * Establece el estado de carga de imágenes
   */
  setUploadingState(isUploading: boolean): void {
    this.isUploadingImages.set(isUploading);
  }
  /**
   * Limpia todas las imágenes
   */
  clearImages(): void {
    console.log('🗑️ Limpiando todas las imágenes');
    
    // Limpiar URLs de preview
    this.images().forEach(imageData => {
      if (typeof imageData.url === 'string' && imageData.url.startsWith('blob:')) {
        URL.revokeObjectURL(imageData.url);
      }
    });
    
    // Resetear estado
    this.images.set([]);
    this.selectedImageIndex.set(-1);
    
    console.log('✅ Imágenes limpiadas');
  }
}
