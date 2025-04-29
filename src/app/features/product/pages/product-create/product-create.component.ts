import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { CreateProduct, ProductStatus } from '../../interfaces/product.interface';
import { ProductsService } from '../../services/products.service';

@Component({
  selector: 'app-product-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCreateComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private productService = inject(ProductsService);
  
  productStatuses = Object.values(ProductStatus);
  isSubmitting = signal(false);
  formError = signal<string | null>(null);
  formSuccess = signal<boolean>(false);

  productForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', Validators.minLength(10)],
    dimensions: this.fb.group({
      width: [null],
      height: [null],
      depth: [null]
    }),
    weight: [0, [Validators.required, Validators.min(0)]],
    material: [''],
    price: [null, Validators.min(0)],
    stock: [null, Validators.min(1)],
    state: [ProductStatus.AVAILABLE, Validators.required],
    keywords: this.fb.array([])
  });

  get keywordControls() {
    return (this.productForm.get('keywords') as FormArray).controls as FormControl[];
  }

  addKeyword() {
    const keywordsArray = this.productForm.get('keywords') as FormArray;
    keywordsArray.push(new FormControl(''));
  }

  removeKeyword(index: number) {
    const keywordsArray = this.productForm.get('keywords') as FormArray;
    keywordsArray.removeAt(index);
  }

  onSubmit() {
    if (this.productForm.invalid) {
      this.markFormGroupTouched(this.productForm);
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
    })

  }

  resetForm() {
    this.productForm.reset({
      state: ProductStatus.AVAILABLE,
      weight: 0
    });
    
    const keywordsArray = this.productForm.get('keywords') as FormArray;
    while (keywordsArray.length) {
      keywordsArray.removeAt(0);
    }
    
    this.formSuccess.set(false);
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
