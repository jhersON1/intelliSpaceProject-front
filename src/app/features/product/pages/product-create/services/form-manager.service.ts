import { Injectable, inject, signal, effect } from '@angular/core';
import { FormBuilder, FormArray, FormControl, FormGroup } from '@angular/forms';
import { ProductFormBase } from '../../../services/productFormBase.service';
import { ImageManagerService } from './image-manager.service';


@Injectable({
  providedIn: 'root'
})
export class FormManagerService {
  private fb = inject(FormBuilder);
  private productFormBase = inject(ProductFormBase);
  private imageManager = inject(ImageManagerService);

  private _productForm: FormGroup | null = null;

  initializeProductForm(): FormGroup {
    console.log('📝 FormManagerService.initializeProductForm...');
    const baseForm = this.productFormBase.createBaseProductForm();

    (baseForm as any).addControl('keywords', this.fb.array([]));
    (baseForm as any).addControl('imageUrls', this.fb.array([]));

    this._productForm = baseForm;
    this.setupImageSyncEffect();

    console.log('✅ Formulario de producto inicializado:', baseForm.controls);
    return baseForm;
  }

  /**
   * Configuración del efecto para sincronizar imágenes
   */
  private setupImageSyncEffect(): void {
    console.log('🔄 Configurando effect para sincronización de imágenes...');
    effect(() => {
      const currentImages = this.imageManager.images();
      const imageArray = this.getImageUrlsArray();
      
      if (imageArray && imageArray.length !== currentImages.length) {
        this.imageManager.syncImagesWithFormArray(imageArray);
      }
    });
    console.log('✅ Effect configurado exitosamente');
  }

  /**
   * Obtiene el FormArray de imageUrls
   */
  getImageUrlsArray(): FormArray {
    if (!this._productForm) {
      return this.fb.array([]);
    }
    const control = this._productForm.get('imageUrls') as FormArray;
    return control || this.fb.array([]);
  }

  /**
   * Obtiene el FormArray de keywords
   */
  getKeywordsArray(): FormArray {
    if (!this._productForm) {
      return this.fb.array([]);
    }
    return this._productForm.get('keywords') as FormArray;
  }

  /**
   * Getter que proporciona acceso tipado a los controles de keywords
   */
  get keywordControls(): FormControl[] {
    if (!this._productForm) {
      return [];
    }
    const keywordsControl = this._productForm.get('keywords');

    if (keywordsControl instanceof FormArray) {
      return keywordsControl.controls as FormControl[];
    }

    return [];
  }

  /**
   * Agrega un nuevo campo de keyword al FormArray
   */
  addKeyword(): void {
    const keywordsArray = this.getKeywordsArray();
    keywordsArray.push(new FormControl(''));
  }

  /**
   * Elimina un campo de keyword específico del FormArray
   */
  removeKeyword(index: number): void {
    const keywordsArray = this.getKeywordsArray();
    keywordsArray.removeAt(index);
  }

  /**
   * Maneja los cambios en la selección de categorías
   */
  onCategoriesChange(categories: string[]): void {
    if (this._productForm) {
      this.productFormBase.onCategoriesChange(categories, this._productForm);
    }
  }

  /**
   * Maneja el caso cuando el formulario es inválido
   */
  handleInvalidForm(): void {
    if (this._productForm) {
      this.productFormBase.markFormGroupTouched(this._productForm);
    }
  }

  /**
   * Resetea el formulario
   */
  resetForm(): void {
    if (!this._productForm) return;

    this._productForm.reset({
      state: this.productFormBase.productStatuses[0],
      weight: 0
    });

    this.clearKeywordsArray();
    this.imageManager.reset();
    this.productFormBase.resetSignals();
  }

  /**
   * Limpia el array de keywords
   */
  private clearKeywordsArray(): void {
    const keywordsArray = this.getKeywordsArray();

    while (keywordsArray.length > 0) {
      keywordsArray.removeAt(0);
    }
  }
  /**
   * Resetea los keywords a estado inicial
   */
  resetKeywords(): void {
    const keywordsFormArray = this.getImageUrlsArray();
    
    // Limpiar todos los keywords excepto el primero
    while (keywordsFormArray.length > 1) {
      keywordsFormArray.removeAt(keywordsFormArray.length - 1);
    }
    
    keywordsFormArray.at(0)?.setValue('');
    
    console.log('✅ Keywords reseteados');
  }

  /**
   * Obtiene el formulario actual
   */
  getForm(): FormGroup | null {
    return this._productForm;
  }

  /**
   * Valida si el formulario es válido
   */
  isFormValid(): boolean {
    return this._productForm?.valid || false;
  }
}
