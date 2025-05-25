import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductStatus, Product } from '../../interfaces/product.interface';
import { CommonModule } from '@angular/common';
import { ProductsService } from '../../services/products.service';
import { CategorySelectorComponent } from '../../components/category-selector/category-selector.component';
import { ProductFormBase } from '../../services/productFormBase.service';
import { forkJoin, firstValueFrom } from 'rxjs';
import { VisualRepresentation } from '../../interfaces/visual-representation.interface';
import { VisualRepresentationService } from '../../services/visual-representation.service';
import { ImageUploadService } from '../../services/image-upload.service';

interface ImagePreview {
  id?: string;
  name: string;
  url: string | ArrayBuffer;
  isExisting: boolean;
}

interface ImageState {
  existing: VisualRepresentation[];
  pendingDelete: string[];
  newImages: File[];
  previews: ImagePreview[];
}

@Component({
  selector: 'app-product-vendor-edit',
  imports: [ReactiveFormsModule, CommonModule, CategorySelectorComponent],
  templateUrl: './product-vendor-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductVendorEditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductsService);
  private readonly visualRepresentationService = inject(VisualRepresentationService);
  private readonly imageUploadService = inject(ImageUploadService);
  protected readonly formBaseService = inject(ProductFormBase);

  readonly ProductStatus = ProductStatus;
  private readonly MAX_IMAGES = 10;

  readonly hierarchicalCategories = this.formBaseService.hierarchicalCategories;
  readonly selectedCategories = this.formBaseService.selectedCategories;

  private readonly imageState = signal<ImageState>({
    existing: [],
    pendingDelete: [],
    newImages: [],
    previews: []
  });

  readonly selectedImageIndex = signal<number>(-1);
  readonly isLoading = signal<boolean>(false);

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

  readonly form: FormGroup = this.createEditForm();

  get imageUrlsArray(): FormArray {
    return this.form.get('imageUrls') as FormArray;
  }

  constructor() {
    this.setupImageSyncEffect();
  }

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');

    if (!productId) {
      this.navigateToMyProducts();
      return;
    }

    this.initializeComponent(productId);
  }

  /**
   * Efecto para sincronizar imágenes con FormArray
   */
  private setupImageSyncEffect(): void {
    effect(() => {
      const currentImages = this.images();
      if (this.imageUrlsArray.length !== currentImages.length) {
        this.syncImagesWithFormArray(currentImages);
      }
    });
  }

  private initializeComponent(productId: string): void {
    this.loadCategories();
    this.loadProductWithImages(productId);
  }

  /**
   * Carga el producto y sus imágenes de forma paralela
   */
  private loadProductWithImages(productId: string): void {
    this.isLoading.set(true);
    
    forkJoin({
      product: this.productService.getVendorProduct(productId),
      images: this.visualRepresentationService.findAllImages(productId)
    }).subscribe({
      next: ({ product, images }) => {
        console.log('Producto cargado:', product);
        console.log('Imágenes cargadas:', images);
        this.populateFormWithProduct(product);
        this.initializeImageState(images);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar producto e imágenes:', error);
        this.isLoading.set(false);
        // TODO: Mostrar mensaje de error al usuario
      }
    });
  }

  /**
   * Inicializa el estado de imágenes con las imágenes existentes
   */
  private initializeImageState(visualRepresentations: VisualRepresentation[]): void {
    if (!visualRepresentations || visualRepresentations.length === 0) {
      console.log('No se encontraron imágenes para este producto');
      return;
    }

    const previews: ImagePreview[] = visualRepresentations.map(visual => ({
      id: visual.id,
      name: this.extractFileNameFromUrl(visual.url),
      url: visual.url,
      isExisting: true
    }));

    this.imageState.update(state => ({
      ...state,
      existing: [...visualRepresentations],
      previews: [...previews]
    }));

    // Seleccionar la primera imagen por defecto
    if (previews.length > 0) {
      this.selectedImageIndex.set(0);
    }
  }

  private createEditForm(): FormGroup {
    const baseForm = this.formBaseService.createBaseProductForm();
    this.addEditSpecificControls(baseForm);
    return baseForm;
  }

  /**
   * Agrega controles específicos para la edición
   */
  private addEditSpecificControls(form: FormGroup): void {
    const additionalControls = {
      id: this.fb.control(null),
      category: this.fb.control(''),
      imageUrls: this.fb.array([]),
      dimensionsHeight: this.fb.control(0),
      dimensionsWidth: this.fb.control(0),
      dimensionsDepth: this.fb.control(0),
      keywords: this.fb.control('')
    };

    Object.entries(additionalControls).forEach(([key, control]) => {
      (form as any).addControl(key, control);
    });
  }

  private loadCategories(): void {
    this.formBaseService.loadCategories().subscribe({
      next: () => console.log('Categorías cargadas exitosamente'),
      error: (error) => console.error('Error cargando categorías:', error)
    });
  }

  public onCategoriesChange(categories: string[]): void {
    this.formBaseService.onCategoriesChange(categories, this.form);
  }

  /**
   * Sincroniza las imágenes con el FormArray
   */
  private syncImagesWithFormArray(images: ImagePreview[]): void {
    this.clearFormArray();

    images.forEach(img => {
      this.imageUrlsArray.push(this.fb.control(img.name));
    });
  }

  private clearFormArray(): void {
    while (this.imageUrlsArray.length) {
      this.imageUrlsArray.removeAt(0);
    }
  }

  private populateFormWithProduct(product: Product): void {
    this.setupProductCategories(product);
    this.patchFormWithProductData(product);
  }

  private setupProductCategories(product: Product): void {
    if (product.idCategory) {
      this.formBaseService.onCategoriesChange(product.idCategory, this.form);
    }
  }

  private patchFormWithProductData(product: Product): void {
    const dimensions = (product.dimensions as any) || {};

    this.form.patchValue({
      id: product.id,
      title: product.title,
      description: product.description || '',
      price: product.price || 0,
      stock: product.stock || 0,
      weight: product.weight,
      state: product.state,
      category: product.category || '',
      material: product.material || '',
      dimensionsHeight: dimensions.height || 0,
      dimensionsWidth: dimensions.width || 0,
      dimensionsDepth: dimensions.depth || 0,
      keywords: this.formatKeywordsForDisplay(product.keywords),
    });
  }

  private formatKeywordsForDisplay(keywords?: string[]): string {
    return keywords?.join(', ') || '';
  }

  private extractFileNameFromUrl(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Maneja la selección de archivos de imagen
   */
  public onFileSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;

    // Validar límite de imágenes
    const currentState = this.imageState();
    const currentCount = currentState.existing.length - currentState.pendingDelete.length + currentState.newImages.length;
    const availableSlots = this.MAX_IMAGES - currentCount;

    if (files.length > availableSlots) {
      alert(`Solo puedes agregar ${availableSlots} imagen(es) más. Máximo ${this.MAX_IMAGES} imágenes por producto.`);
      return;
    }

    this.processSelectedFiles(files);
    this.resetFileInput(event.target as HTMLInputElement);
  }

  private processSelectedFiles(files: FileList): void {
    const fileArray = Array.from(files);
    
    fileArray.forEach(file => {
      this.readFileAsDataURL(file);
    });

    // Agregar archivos al estado
    this.imageState.update(state => ({
      ...state,
      newImages: [...state.newImages, ...fileArray]
    }));
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
      previews: [
        ...state.previews,
        { name: fileName, url, isExisting }
      ]
    }));

    this.selectedImageIndex.set(this.images().length - 1);
  }

  private resetFileInput(input: HTMLInputElement): void {
    input.value = '';
  }

  public selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  /**
   * Remueve una imagen (existente o nueva)
   */
  public removeImage(index: number): void {
    const currentPreviews = [...this.images()];
    const imageToRemove = currentPreviews[index];

    if (!imageToRemove) return;

    if (imageToRemove.isExisting && imageToRemove.id) {
      // Es una imagen existente, marcar para eliminar
      this.markImageForDeletion(imageToRemove.id, index);
    } else {
      // Es una imagen nueva, remover del array de nuevas imágenes
      this.removeNewImage(index, imageToRemove);
    }

    this.updateSelectedIndexAfterRemoval(index);
  }

  /**
   * Marca una imagen existente para eliminación
   */
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

  /**
   * Remueve una imagen nueva del estado
   */
  private removeNewImage(previewIndex: number, imageToRemove: ImagePreview): void {
    this.imageState.update(state => {
      const updatedPreviews = [...state.previews];
      updatedPreviews.splice(previewIndex, 1);

      // Encontrar y remover el archivo del array de nuevas imágenes
      const newImageIndex = state.newImages.findIndex(file => file.name === imageToRemove.name);
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

  /**
   * Cancela la edición y restaura el estado original
   */
  public onCancel(): void {
    this.resetImageState();
    this.navigateToMyProducts();
  }

  /**
   * Resetea el estado de imágenes al original
   */
  private resetImageState(): void {
    const originalPreviews: ImagePreview[] = this.imageState().existing.map(visual => ({
      id: visual.id,
      name: this.extractFileNameFromUrl(visual.url),
      url: visual.url,
      isExisting: true
    }));

    this.imageState.update(state => ({
      ...state,
      pendingDelete: [],
      newImages: [],
      previews: [...originalPreviews]
    }));

    if (originalPreviews.length > 0) {
      this.selectedImageIndex.set(0);
    } else {
      this.selectedImageIndex.set(-1);
    }
  }

  /**
   * Guarda el producto ejecutando todas las operaciones pendientes
   */
  public async onSubmit(): Promise<void> {
    if (!this.form.valid) {
      this.formBaseService.markFormGroupTouched(this.form);
      return;
    }

    this.isLoading.set(true);

    try {
      await this.executeImageOperations();
      await this.updateProductData();
      this.navigateToMyProducts();
    } catch (error) {
      console.error('Error al guardar producto:', error);
      // TODO: Mostrar mensaje de error específico
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Ejecuta todas las operaciones de imágenes pendientes
   */
  private async executeImageOperations(): Promise<void> {
    const state = this.imageState();
    
    // 1. Eliminar imágenes marcadas
    if (state.pendingDelete.length > 0) {
      await this.deleteMarkedImages(state.pendingDelete);
    }

    // 2. Subir y crear nuevas imágenes
    if (state.newImages.length > 0) {
      await this.uploadAndCreateNewImages(state.newImages);
    }
  }

  /**
   * Elimina las imágenes marcadas para eliminación
   */
  private async deleteMarkedImages(imageIds: string[]): Promise<void> {
    const deletePromises = imageIds.map(id => 
      firstValueFrom(this.visualRepresentationService.deleteVisualRepresentation(id))
    );

    await Promise.all(deletePromises);
    console.log(`${imageIds.length} imágenes eliminadas exitosamente`);
  }

  /**
   * Sube nuevas imágenes y crea sus representaciones visuales
   */
  private async uploadAndCreateNewImages(files: File[]): Promise<void> {
    // Subir a Cloudinary
    const uploadResponse = await firstValueFrom(this.imageUploadService.uploadMultipleImages(files));
    
    if (!uploadResponse?.images || uploadResponse.images.length === 0) {
      throw new Error('No se pudieron subir las imágenes');
    }

    // Crear visual representations
    const productId = this.form.value.id;
    const createPromises = uploadResponse.images.map((url, index) => {
      const createDto = {
        productId,
        type: 'Image',
        url,
        altText: files[index].name,
        isPrincipal: false
      };
      
      return firstValueFrom(this.imageUploadService.createVisualRepresentation(createDto));
    });

    await Promise.all(createPromises);
    console.log(`${files.length} nuevas imágenes creadas exitosamente`);
  }

  /**
   * Actualiza los datos del producto
   */
  private async updateProductData(): Promise<void> {
    const updateData = this.buildUpdateData();
    const productId = this.form.value.id;

    await firstValueFrom(this.productService.updateProduct(productId, updateData));
    console.log('Datos del producto actualizados exitosamente');
  }

  private buildUpdateData(): any {
    const formData = this.form.value;

    return {
      title: formData.title,
      description: formData.description,
      weight: formData.weight,
      price: formData.price,
      material: formData.material,
      stock: formData.stock,
      state: formData.state,
      dimensions: {
        height: formData.dimensionsHeight,
        width: formData.dimensionsWidth,
        depth: formData.dimensionsDepth
      },
      keywords: this.parseKeywords(formData.keywords),
      idCategory: formData.idCategory,
    };
  }

  private parseKeywords(keywordsString: string): string[] {
    return keywordsString
      ? keywordsString.split(',').map(k => k.trim()).filter(k => k.length > 0)
      : [];
  }

  private navigateToMyProducts(): void {
    this.router.navigate(['/home/my-products']);
  }
}
