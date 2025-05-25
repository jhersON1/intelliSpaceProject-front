import { Injectable, computed, signal } from '@angular/core';
import { ImagePreview, ImageState } from '../interface/image-state.interface';


@Injectable({
  providedIn: 'root'
})
export class ImageStateService {
  private readonly MAX_IMAGES = 10;
  private readonly imageState = signal<ImageState>({
    existing: [],
    pendingDelete: [],
    newImages: [],
    previews: []
  });

  readonly selectedImageIndex = signal<number>(-1);
  readonly images = computed(() => this.imageState().previews);
  readonly canAddMoreImages = computed(() => {
    const state = this.imageState();
    const currentCount = state.existing.length - state.pendingDelete.length + state.newImages.length;
    return currentCount < this.MAX_IMAGES;
  });

  readonly selectedImage = computed(() => {
    const index = this.selectedImageIndex();
    const allImages = this.images();
    return index >= 0 && index < allImages.length ? allImages[index] : null;
  });

  initializeImages(visualRepresentations: any[]): void {
    if (!visualRepresentations?.length) return;

    const previews: ImagePreview[] = visualRepresentations.map(visual => ({
      id: visual.id,
      name: this.extractFileNameFromUrl(visual.url),
      url: visual.url,
      isExisting: true
    }));

    this.imageState.set({
      existing: [...visualRepresentations],
      pendingDelete: [],
      newImages: [],
      previews: [...previews]
    });

    if (previews.length > 0) {
      this.selectedImageIndex.set(0);
    }
  }

  addNewImages(files: File[]): boolean {
    const currentState = this.imageState();
    const currentCount = currentState.existing.length - currentState.pendingDelete.length + currentState.newImages.length;
    const availableSlots = this.MAX_IMAGES - currentCount;

    if (files.length > availableSlots) {
      return false;
    }

    files.forEach(file => this.readFileAsDataURL(file));
    
    this.imageState.update(state => ({
      ...state,
      newImages: [...state.newImages, ...files]
    }));

    return true;
  }

  removeImage(index: number): void {
    const imageToRemove = this.images()[index];
    if (!imageToRemove) return;

    if (imageToRemove.isExisting && imageToRemove.id) {
      this.markImageForDeletion(imageToRemove.id, index);
    } else {
      this.removeNewImage(index, imageToRemove);
    }

    this.updateSelectedIndexAfterRemoval(index);
  }

  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  reset(): void {
    const originalPreviews: ImagePreview[] = this.imageState().existing.map((visual: { id: any; url: string; }) => ({
      id: visual.id,
      name: this.extractFileNameFromUrl(visual.url),
      url: visual.url,
      isExisting: true
    }));

    this.imageState.set({
      existing: this.imageState().existing,
      pendingDelete: [],
      newImages: [],
      previews: [...originalPreviews]
    });

    this.selectedImageIndex.set(originalPreviews.length > 0 ? 0 : -1);
  }

  getState(): ImageState {
    return this.imageState();
  }

  private extractFileNameFromUrl(url: string): string {
    return url.split('/').pop() || '';
  }

  private readFileAsDataURL(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        this.addImagePreview(file.name, reader.result, false);
      }
    };
    reader.readAsDataURL(file);
  }

  private addImagePreview(fileName: string, url: string | ArrayBuffer, isExisting: boolean): void {
    this.imageState.update(state => ({
      ...state,
      previews: [...state.previews, { name: fileName, url, isExisting }]
    }));
    this.selectedImageIndex.set(this.images().length - 1);
  }

  private markImageForDeletion(imageId: string, previewIndex: number): void {
    this.imageState.update(state => {
      const updatedPreviews = [...state.previews];
      updatedPreviews.splice(previewIndex, 1);
      return {
        ...state,
        pendingDelete: [...state.pendingDelete, imageId],
        previews: updatedPreviews
      };
    });
  }

  private removeNewImage(previewIndex: number, imageToRemove: ImagePreview): void {
    this.imageState.update(state => {
      const updatedPreviews = [...state.previews];
      updatedPreviews.splice(previewIndex, 1);
      
      const newImageIndex = state.newImages.findIndex((file: { name: any; }) => file.name === imageToRemove.name);
      const updatedNewImages = [...state.newImages];
      if (newImageIndex > -1) {
        updatedNewImages.splice(newImageIndex, 1);
      }

      return {
        ...state,
        newImages: updatedNewImages,
        previews: updatedPreviews
      };
    });
  }

  private updateSelectedIndexAfterRemoval(removedIndex: number): void {
    const currentSelectedIndex = this.selectedImageIndex();
    const remainingImagesCount = this.images().length;

    if (currentSelectedIndex === removedIndex) {
      this.selectedImageIndex.set(remainingImagesCount > 0 ? 0 : -1);
    } else if (currentSelectedIndex > removedIndex) {
      this.selectedImageIndex.update(idx => idx - 1);
    }
  }
}
