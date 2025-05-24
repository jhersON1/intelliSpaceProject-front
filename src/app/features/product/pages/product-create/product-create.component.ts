import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormArray, ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { CreateProduct } from '../../interfaces/product.interface';
import { ProductsService } from '../../services/products.service';
import { CategorySelectorComponent } from '../../components/category-selector/category-selector.component';
import { ProductFormBase } from '../../services/productFormBase.service';
import { ImageUploadService } from '../../services/image-upload.service';
import { forkJoin } from 'rxjs';

interface ImagePreview {
  name: string;
  url: string | ArrayBuffer;
  file?: File;
}

@Component({
  selector: 'app-product-create',
  imports: [CommonModule, ReactiveFormsModule, CategorySelectorComponent],
  templateUrl: './product-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private productService = inject(ProductsService);
  protected productFormBase = inject(ProductFormBase);
  private imageUploadService = inject(ImageUploadService);

  readonly productStatuses = this.productFormBase.productStatuses;
  readonly isSubmitting = this.productFormBase.isSubmitting;
  readonly formError = this.productFormBase.formError;
  readonly hierarchicalCategories = this.productFormBase.hierarchicalCategories;
  readonly selectedCategories = this.productFormBase.selectedCategories;
  readonly isUploadingImages = signal<boolean>(false);

  readonly formSuccess = signal<boolean>(false);
  readonly images = signal<ImagePreview[]>([]);
  readonly selectedImageIndex = signal<number>(-1);

  readonly selectedImage = computed(() => {
    const index = this.selectedImageIndex();
    const allImages = this.images();
    return index >= 0 && index < allImages.length ? allImages[index] : null;
  });

  readonly productForm = this.initializeProductForm();

  get imageUrlsArray(): FormArray {
    const control = this.productForm.get('imageUrls') as FormArray;
    return control || this.fb.array([]);
  }

  constructor() {
    this.setupImageSyncEffect();
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  /**
   * Configuración del efecto para sincronizar imágenes
   */
  private setupImageSyncEffect(): void {
    effect(() => {
      const currentImages = this.images();
      const imageArray = this.imageUrlsArray;
      
      if (imageArray && imageArray.length !== currentImages.length) {
        this.syncImagesWithFormArray(currentImages);
      }
    });
  }

  /**
   * Inicializa el formulario de producto agregando el FormArray de keywords
   * al formulario base proporcionado por ProductFormBase.
   * 
   * @returns FormGroup configurado para creación de productos
   */
  private initializeProductForm(): FormGroup {
    const baseForm = this.productFormBase.createBaseProductForm();

    // Agregar controles adicionales para creación
    (baseForm as any).addControl('keywords', this.fb.array([]));
    (baseForm as any).addControl('imageUrls', this.fb.array([]));

    return baseForm;
  }

  /**
   * Carga las categorías disponibles desde el servicio.
   * Maneja errores de carga y actualiza el estado de error si es necesario.
   */
  private loadCategories(): void {
    this.productFormBase.loadCategories().subscribe({
      next: () => {
        // Categorías cargadas exitosamente - no se requiere acción adicional
      },
      error: (error) => {
        const errorMessage = 'Error al cargar las categorías';
        this.formError.set(errorMessage);
        console.error(errorMessage, error);
      }
    });
  }

  /**
   * Maneja los cambios en la selección de categorías.
   * Delega la lógica al ProductFormBase para mantener consistencia.
   * 
   * @param categories - Array de IDs de categorías seleccionadas
   */
  onCategoriesChange(categories: string[]): void {
    this.productFormBase.onCategoriesChange(categories, this.productForm);
  }

  /**
   * Getter que proporciona acceso tipado a los controles de keywords.
   * Facilita la iteración en el template y proporciona type safety.
   * 
   * @returns Array de FormControl para las keywords
   */
  get keywordControls(): FormControl[] {
    const keywordsControl = this.productForm.get('keywords');

    if (keywordsControl instanceof FormArray) {
      return keywordsControl.controls as FormControl[];
    }

    return [];
  }

  /**
   * Agrega un nuevo campo de keyword al FormArray.
   * Crea un FormControl vacío y lo añade al final del array.
   */
  addKeyword(): void {
    const keywordsArray = this.getKeywordsArray();
    keywordsArray.push(new FormControl(''));
  }

  /**
   * Elimina un campo de keyword específico del FormArray.
   * 
   * @param index - Índice del campo a eliminar
   */
  removeKeyword(index: number): void {
    const keywordsArray = this.getKeywordsArray();
    keywordsArray.removeAt(index);
  }

  /**
   * Sincroniza las imágenes con el FormArray
   */
  private syncImagesWithFormArray(images: ImagePreview[]): void {
    this.clearFormArray();

    images.forEach(img => {
      const imageArray = this.imageUrlsArray;
      if (imageArray) {
        imageArray.push(this.fb.control(img.name));
      }
    });
  }

  private clearFormArray(): void {
    const imageArray = this.imageUrlsArray;
    if (imageArray) {
      while (imageArray.length) {
        imageArray.removeAt(0);
      }
    }
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
        // Guardar tanto la URL como la referencia del archivo
        this.addImagePreview(file.name, reader.result, file);
      }
    };

    reader.readAsDataURL(file);
  }

  private addImagePreview(fileName: string, url: string | ArrayBuffer, file: File): void {
    this.images.update(currentImages => [
      ...currentImages,
      { name: fileName, url, file } // Incluir la referencia del archivo
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

  /**
   * Maneja el envío del formulario de creación de producto.
   * Valida los datos, envía la petición al servicio y maneja la respuesta.
   */
  onSubmit(): void {
    if (this.productForm.invalid) {
      this.handleInvalidForm();
      return;
    }

    this.submitProduct();
  }

  /**
   * Maneja el caso cuando el formulario es inválido.
   * Marca todos los campos como tocados y muestra mensaje de error.
   */
  private handleInvalidForm(): void {
    this.productFormBase.markFormGroupTouched(this.productForm);
    this.formError.set('Por favor, complete correctamente todos los campos requeridos.');
  }

  private submitProduct(): void {
    this.isSubmitting.set(true);
    this.formError.set(null);

    // Primero subir las imágenes, luego crear el producto
    this.uploadImagesAndCreateProduct();
  }

  /**
   * Sube las imágenes a Cloudinary y luego crea el producto
   */
  private uploadImagesAndCreateProduct(): void {
    const imagesToUpload = this.getFilesToUpload();

    if (imagesToUpload.length === 0) {
      // No hay imágenes para subir, crear producto directamente
      this.createProductAndHandleImages([]);
      return;
    }

    this.isUploadingImages.set(true);

    this.imageUploadService.uploadMultipleImages(imagesToUpload).subscribe({
      next: (response) => {
        this.isUploadingImages.set(false);
        this.createProductAndHandleImages(response.images);
      },
      error: (error) => {
        this.isUploadingImages.set(false);
        this.handleImageUploadError(error);
      }
    });
  }

    /**
   * Crea el producto y luego envía las imágenes al backend
   */
  private createProductAndHandleImages(imageUrls: string[]): void {
    // Crear el producto SIN imageUrls
    const formValue = this.productForm.value;
    const createProduct: CreateProduct = {
      title: formValue.title,
      description: formValue.description,
      dimensions: formValue.dimensions,
      weight: formValue.weight,
      material: formValue.material,
      price: formValue.price,
      stock: formValue.stock,
      state: formValue.state,
      keywords: formValue.keywords,
      idCategory: formValue.idCategory
    };

    this.productService.createProduct(createProduct).subscribe({
      next: (createdProduct) => {
        // Una vez creado el producto, enviar las imágenes si las hay
        if (imageUrls.length > 0) {
          this.sendProductImages(createdProduct.id, imageUrls);
        } else {
          this.handleSuccessfulCreation();
        }
      },
      error: (error) => this.handleCreationError(error)
    });
  }

    /**
   * Envía las imágenes al backend con la estructura correcta
   */
  private sendProductImages(productId: string, imageUrls: string[]): void {
    const imageRequests = imageUrls.map((url, index) => {
      const visualRepresentation = {
        productId: productId,
        type: "Image",
        url: url,
        altText: `Imagen ${index + 1} del producto`,
        isPrincipal: index === 0 // La primera imagen es principal
      };

      return this.imageUploadService.createVisualRepresentation(visualRepresentation);
    });

    // Enviar todas las imágenes en paralelo
    forkJoin(imageRequests).subscribe({
      next: () => this.handleSuccessfulCreation(),
      error: (error) => this.handleCreationError(error)
    });
  }

  /**
   * Obtiene los archivos File que necesitan ser subidos
   */
  private getFilesToUpload(): File[] {
    return this.images()
      .map(img => img.file)
      .filter((file): file is File => file instanceof File);
  }


  /**
   * Maneja los errores durante la subida de imágenes
   */
  private handleImageUploadError(error: any): void {
    this.isSubmitting.set(false);
    const errorMessage = error?.error?.message || 'Error al subir las imágenes. Inténtelo nuevamente.';
    this.formError.set(errorMessage);
    console.error('Error uploading images:', error);
  }

  /**
   * Maneja la respuesta exitosa de creación de producto.
   * Actualiza el estado, resetea el formulario y navega a la lista de productos.
   */
  private handleSuccessfulCreation(): void {
    this.formSuccess.set(true);
    this.isSubmitting.set(false);
    this.resetForm();
    this.router.navigate(['/products']);
  }

  /**
   * Maneja los errores durante la creación del producto.
   * Actualiza el estado de carga y muestra el mensaje de error correspondiente.
   * 
   * @param error - Error recibido del servicio
   */
  private handleCreationError(error: any): void {
    this.isSubmitting.set(false);
    const errorMessage = error?.error?.message || 'Ocurrió un error al crear el producto.';
    this.formError.set(errorMessage);
  }


  private getKeywordsArray(): FormArray {
    return this.productForm.get('keywords') as FormArray;
  }

  resetForm(): void {
    this.productForm.reset({
      state: this.productStatuses[0],
      weight: 0
    });

    this.clearKeywordsArray();
    this.images.set([]);
    this.selectedImageIndex.set(-1);

    this.formSuccess.set(false);
    this.productFormBase.resetSignals();
  }

  private clearKeywordsArray(): void {
    const keywordsArray = this.getKeywordsArray();

    while (keywordsArray.length > 0) {
      keywordsArray.removeAt(0);
    }
  }
}
