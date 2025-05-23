import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormArray, ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { CreateProduct } from '../../interfaces/product.interface';
import { ProductsService } from '../../services/products.service';
import { CategorySelectorComponent } from '../../components/category-selector/category-selector.component';
import { ProductFormBase } from '../../abstract/productFormBase.abstract';

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

  readonly productStatuses = this.productFormBase.productStatuses;
  readonly isSubmitting = this.productFormBase.isSubmitting;
  readonly formError = this.productFormBase.formError;
  readonly hierarchicalCategories = this.productFormBase.hierarchicalCategories;
  readonly selectedCategories = this.productFormBase.selectedCategories;

  readonly formSuccess = signal<boolean>(false);

  readonly productForm = this.initializeProductForm();

  ngOnInit(): void {
    this.loadCategories();
  }

  /**
   * Inicializa el formulario de producto agregando el FormArray de keywords
   * al formulario base proporcionado por ProductFormBase.
   * 
   * @returns FormGroup configurado para creación de productos
   */
  private initializeProductForm(): FormGroup {
    const baseForm = this.productFormBase.createBaseProductForm();

    // Agregar el control de keywords como FormArray
    (baseForm as any).addControl('keywords', this.fb.array([]));

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

    const createProduct: CreateProduct = this.productForm.value as CreateProduct;

    this.productService.createProduct(createProduct).subscribe({
      next: () => this.handleSuccessfulCreation(),
      error: (error) => this.handleCreationError(error)
    });
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
