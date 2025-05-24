import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductStatus, Product } from '../../interfaces/product.interface';
import { CommonModule } from '@angular/common';
import { ProductsService } from '../../services/products.service';
import { CategorySelectorComponent } from '../../components/category-selector/category-selector.component';
import { ProductFormBase } from '../../services/productFormBase.service';

interface ImagePreview {
  name: string;
  url: string | ArrayBuffer;
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
  protected readonly formBaseService = inject(ProductFormBase);

  readonly ProductStatus = ProductStatus;

  readonly hierarchicalCategories = this.formBaseService.hierarchicalCategories;
  readonly selectedCategories = this.formBaseService.selectedCategories;

  readonly images = signal<ImagePreview[]>([]);
  readonly selectedImageIndex = signal<number>(-1);

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
   * Configuración del efecto para sincronizar imágenes
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
    this.loadProduct(productId);
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

  /**
   * Carga las categorías disponibles
   */
  private loadCategories(): void {
    this.formBaseService.loadCategories().subscribe({
      next: () => console.log('Categorías cargadas exitosamente'),
      error: (error) => console.error('Error cargando categorías:', error)
    });
  }

  /**
   * Carga el producto por ID
   */
  private loadProduct(id: string): void {
    this.productService.getVendorProduct(id).subscribe({
      next: (product: Product) => {
        console.log('Producto cargado:', product);
        this.populateFormWithProduct(product);
      },
      error: (error) => {
        console.error('Error al cargar producto:', error);
        // TODO: Mostrar mensaje de error al usuario
      }
    });
  }

  /**
   * Maneja el cambio de categorías
   */
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

  /**
   * Llena el formulario con los datos del producto
   */
  private populateFormWithProduct(product: Product): void {
    this.setupProductImages(product);
    this.setupProductCategories(product);
    this.patchFormWithProductData(product);
  }

  /**
   * Configura las imágenes del producto
   */
  private setupProductImages(product: Product): void {
    if (!product.imageUrl) return;

    const imageUrls = Array.isArray(product.imageUrl) ? product.imageUrl : [product.imageUrl];
    const newImages = imageUrls.map(url => ({
      name: this.extractFileNameFromUrl(url),
      url: url
    }));

    this.images.set(newImages);

    if (newImages.length > 0) {
      this.selectedImageIndex.set(0);
    }
  }

  /**
   * Configura las categorías del producto
   */
  private setupProductCategories(product: Product): void {
    if (product.idCategory) {
      this.formBaseService.onCategoriesChange(product.idCategory, this.form);
    }
  }

  /**
   * Aplica los valores del producto al formulario
   */
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

  /**
   * Formatea las keywords para mostrar en el formulario
   */
  private formatKeywordsForDisplay(keywords?: string[]): string {
    return keywords?.join(', ') || '';
  }

  /**
   * Extrae el nombre del archivo de una URL
   */
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

    this.processSelectedFiles(files);
    this.resetFileInput(event.target as HTMLInputElement);
  }

  private processSelectedFiles(files: FileList): void {
    Array.from(files).forEach(file => {
      this.readFileAsDataURL(file);
    });
  }

  private readFileAsDataURL(file: File): void {
    const reader = new FileReader();

    reader.onload = () => {
      if (reader.result) {
        this.addImagePreview(file.name, reader.result);
      }
    };

    reader.readAsDataURL(file);
  }

  private addImagePreview(fileName: string, url: string | ArrayBuffer): void {
    this.images.update(currentImages => [
      ...currentImages,
      { name: fileName, url }
    ]);

    this.selectedImageIndex.set(this.images().length - 1);
  }

  private resetFileInput(input: HTMLInputElement): void {
    input.value = '';
  }

  public selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  public removeImage(index: number): void {
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

  public onSubmit(): void {
    if (!this.form.valid) {
      this.formBaseService.markFormGroupTouched(this.form);
      return;
    }

    const updateData = this.buildUpdateData();
    this.updateProduct(updateData);
  }

  /**
   * Construye los datos para actualizar el producto
   */
  private buildUpdateData(): any {
    const formData = this.form.value;

    const updateData = {
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

    return updateData;
  }

  /**
   * Parsea las keywords del string a array
   */
  private parseKeywords(keywordsString: string): string[] {
    return keywordsString
      ? keywordsString.split(',').map(k => k.trim()).filter(k => k.length > 0)
      : [];
  }

  private updateProduct(updateData: any): void {
    const productId = this.form.value.id;

    this.productService.updateProduct(productId, updateData).subscribe({
      next: (response) => {
        console.log('Producto actualizado:', response);
        this.navigateToMyProducts();
      },
      error: (error) => {
        console.error('Error al actualizar producto:', error);
        // TODO: Mostrar mensaje de error al usuario
      }
    });
  }

  /**
   * Cancela la edición y navega a mis productos
   */
  public onCancel(): void {
    this.navigateToMyProducts();
  }

  /**
   * Navega a la página de mis productos
   */
  private navigateToMyProducts(): void {
    this.router.navigate(['/home/my-products']);
  }
}
