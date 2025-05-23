import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormArray, ReactiveFormsModule, FormControl } from '@angular/forms';
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

  productStatuses = this.productFormBase.productStatuses;
  isSubmitting = this.productFormBase.isSubmitting;
  formError = this.productFormBase.formError;
  hierarchicalCategories = this.productFormBase.hierarchicalCategories;
  selectedCategories = this.productFormBase.selectedCategories;

  formSuccess = signal<boolean>(false);

  productForm = this.createProductForm();

  ngOnInit() {
    this.loadCategories();
  }

  private createProductForm() {
    const baseForm = this.productFormBase.createBaseProductForm();

    // Agregar el FormArray de keywords al formulario base
    (baseForm as any).addControl('keywords', this.fb.array([]));
    return baseForm;
  }

  private loadCategories() {
    this.productFormBase.loadCategories().subscribe({
      next: () => {
        // Categorías cargadas exitosamente
      },
      error: (error) => {
        this.formError.set('Error al cargar las categorías');
        console.error('Error cargando categorías:', error);
      }
    });
  }

  onCategoriesChange(categories: string[]) {
    this.productFormBase.onCategoriesChange(categories, this.productForm);
  }

  get keywordControls() {
    const keywordsControl = this.productForm.get('keywords');
    return keywordsControl && keywordsControl instanceof FormArray 
      ? keywordsControl.controls as FormControl[]
      : [];
  }

  addKeyword() {
    const keywordsArray = this.productForm.get('keywords') as unknown as FormArray;
    keywordsArray.push(new FormControl(''));
  }

  removeKeyword(index: number) {
    const keywordsArray = this.productForm.get('keywords') as unknown as FormArray;
    keywordsArray.removeAt(index);
  }

  onSubmit() {
    if (this.productForm.invalid) {
      this.productFormBase.markFormGroupTouched(this.productForm);
      this.formError.set('Por favor, complete correctamente todos los campos requeridos.');
      return;
    }

    this.isSubmitting.set(true);
    this.formError.set(null);

    const createProduct: CreateProduct = this.productForm.value as CreateProduct;

    this.productService.createProduct(createProduct).subscribe({
      next: () => {
        this.formSuccess.set(true);
        this.isSubmitting.set(false);
        this.resetForm();
        this.router.navigate(['/products']);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.formError.set(
          error?.error?.message || 'Ocurrió un error al crear el producto.'
        );
      }
    });
  }

  resetForm() {
    this.productForm.reset({
      state: this.productStatuses[0],
      weight: 0
    });

    const keywordsArray = this.productForm.get('keywords') as unknown as FormArray;
    while (keywordsArray.length) {
      keywordsArray.removeAt(0);
    }

    this.formSuccess.set(false);
    this.productFormBase.resetSignals();
  }
}
