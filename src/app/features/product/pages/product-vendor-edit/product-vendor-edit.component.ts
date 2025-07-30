import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductStatus, Product } from '../../interfaces/product.interface';
import { CommonModule } from '@angular/common';
import { ProductsService } from '../../services/products.service';
import { CategorySelectorComponent } from '../../components/category-selector/category-selector.component';
import { ProductFormBase } from '../../services/productFormBase.service';
import { forkJoin, firstValueFrom, takeUntil, Subject } from 'rxjs';
import { VisualRepresentation } from '../../interfaces/visual-representation.interface';
import { VisualRepresentationService } from '../../services/visual-representation.service';
import { ImageUploadService } from '../../services/image-upload.service';
import { ImageStateService } from './services/image-state.service';
import { ProductOperationsService } from './services/product-operation.service';
import { GlobalCleanupService } from '../../../../core/services/global-cleanup.service';

@Component({
  selector: 'app-product-vendor-edit',
  imports: [ReactiveFormsModule, CommonModule, CategorySelectorComponent],
  templateUrl: './product-vendor-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductVendorEditComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductsService);
  private readonly visualRepresentationService = inject(VisualRepresentationService);
  private readonly formBaseService = inject(ProductFormBase);
  private readonly imageStateService = inject(ImageStateService);
  private readonly productOperationsService = inject(ProductOperationsService);
  private readonly globalCleanupService = inject(GlobalCleanupService);

  private readonly destroy$ = new Subject<void>();

  readonly ProductStatus = ProductStatus;

  readonly hierarchicalCategories = this.formBaseService.hierarchicalCategories;
  readonly selectedCategories = this.formBaseService.selectedCategories;
  readonly images = this.imageStateService.images;
  readonly canAddMoreImages = this.imageStateService.canAddMoreImages;
  readonly selectedImage = this.imageStateService.selectedImage;
  readonly selectedImageIndex = this.imageStateService.selectedImageIndex;

  readonly isLoading = signal<boolean>(false);
  readonly form: FormGroup = this.createEditForm();

  get imageUrlsArray(): FormArray {
    return this.form.get('imageUrls') as FormArray;
  }

  constructor() {
    this.setupImageSyncEffect();
    this.setupStateStockLogic();
  }
  ngOnInit(): void {
    this.globalCleanupService.cleanup$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.resetComponentState();
      });

    const productId = this.route.snapshot.paramMap.get('id');
    
    if (!productId) {
      this.navigateToMyProducts();
      return;
    }

    this.initializeComponent(productId);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Resetea el estado del componente durante la limpieza
   */
  private resetComponentState(): void {
    this.isLoading.set(false);
    this.imageStateService.reset();
    this.form.reset();
  }

  public onFileSelected(event: Event): void {
    const files = this.getFilesFromEvent(event);
    if (!files?.length) return;

    const success = this.imageStateService.addNewImages(Array.from(files));
    
    if (!success) {
      this.showMaxImagesAlert();
    }

    this.resetFileInput(event.target as HTMLInputElement);
  }

  public selectImage(index: number): void {
    this.imageStateService.selectImage(index);
  }

  public removeImage(index: number): void {
    this.imageStateService.removeImage(index);
  }

  public onCategoriesChange(categories: string[]): void {
    this.formBaseService.onCategoriesChange(categories, this.form);
  }

  public onCancel(): void {
    this.imageStateService.reset();
    this.navigateToMyProducts();
  }

  public async onSubmit(): Promise<void> {
    if (!this.isFormValid()) return;

    this.isLoading.set(true);

    try {
      await this.executeAllOperations();
      this.navigateToMyProducts();
    } catch (error) {
      this.handleSubmitError(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private setupImageSyncEffect(): void {
    effect(() => {
      const currentImages = this.images();
      if (this.imageUrlsArray.length !== currentImages.length) {
        this.syncImagesWithFormArray(currentImages);
      }
    });
  }
  private setupStateStockLogic(): void {
    const stateControl = this.form.get('state');
    const stockControl = this.form.get('stock');
    
    if (stateControl && stockControl) {
      stateControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(state => {
        if (state === ProductStatus.SOLD_OUT) {
          stockControl.setValue(0);
          console.log('🔄 Estado "Agotado" detectado - Stock establecido a 0');
        }
      });

      stockControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(stock => {
        if (stock === 0 && stateControl.value === ProductStatus.AVAILABLE) {
          stateControl.setValue(ProductStatus.SOLD_OUT);
          console.log('🔄 Stock=0 detectado - Estado cambiado a "Agotado"');
        }
      });
    }
  }

  private createEditForm(): FormGroup {
    const baseForm = this.formBaseService.createBaseProductForm();
    this.addEditSpecificControls(baseForm);
    return baseForm;
  }

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
      form.addControl(key, control);
    });
  }

  private initializeComponent(productId: string): void {
    this.loadCategories();
    this.loadProductWithImages(productId);
  }
  private loadCategories(): void {
    this.formBaseService.loadCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => console.log('Categorías cargadas exitosamente'),
        error: (error) => console.error('Error cargando categorías:', error)
      });
  }

  private loadProductWithImages(productId: string): void {
    this.isLoading.set(true);
    
    forkJoin({
      product: this.productService.getVendorProduct(productId),
      images: this.visualRepresentationService.findAllImages(productId)
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ product, images }) => {
        this.populateFormWithProduct(product);
        this.imageStateService.initializeImages(images);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar producto e imágenes:', error);
        this.isLoading.set(false);
      }
    });
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

  private syncImagesWithFormArray(images: any[]): void {
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

  private getFilesFromEvent(event: Event): FileList | null {
    return (event.target as HTMLInputElement).files;
  }

  private showMaxImagesAlert(): void {
    const state = this.imageStateService.getState();
    const currentCount = state.existing.length - state.pendingDelete.length + state.newImages.length;
    const availableSlots = 10 - currentCount;
    alert(`Solo puedes agregar ${availableSlots} imagen(es) más. Máximo 10 imágenes por producto.`);
  }

  private resetFileInput(input: HTMLInputElement): void {
    input.value = '';
  }

  private isFormValid(): boolean {
    if (!this.form.valid) {
      this.formBaseService.markFormGroupTouched(this.form);
      return false;
    }
    return true;
  }

  private async executeAllOperations(): Promise<void> {
    const state = this.imageStateService.getState();
    const productId = this.form.value.id;

    if (state.pendingDelete.length > 0) {
      const deleteResult = await this.productOperationsService.deleteImages(state.pendingDelete);
      if (!deleteResult.success) {
        throw new Error(deleteResult.message);
      }
    }

    if (state.newImages.length > 0) {
      const uploadResult = await this.productOperationsService.uploadAndCreateImages(state.newImages, productId);
      if (!uploadResult.success) {
        throw new Error(uploadResult.message);
      }
    }

    const updateData = this.buildUpdateData();
    const updateResult = await this.productOperationsService.updateProduct(productId, updateData);
    
    if (!updateResult.success) {
      throw new Error(updateResult.message);
    }
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

  private formatKeywordsForDisplay(keywords?: string[]): string {
    return keywords?.join(', ') || '';
  }

  private parseKeywords(keywordsString: string): string[] {
    return keywordsString
      ? keywordsString.split(',').map(k => k.trim()).filter(k => k.length > 0)
      : [];
  }

  private handleSubmitError(error: any): void {
    console.error('Error al guardar producto:', error);
    // TODO: Implementar servicio de notificaciones
  }

  private navigateToMyProducts(): void {
    this.router.navigate(['/home/my-products']);
  }
}
