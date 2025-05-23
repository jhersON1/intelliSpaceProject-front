import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { CreateProduct, ProductStatus } from '../../interfaces/product.interface';
import { ProductsService } from '../../services/products.service';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../interfaces/category.interface';
import { map, tap } from 'rxjs';
import { CategorySelectorComponent } from '../../components/category-selector/category-selector.component';

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
  private categoryService = inject(CategoryService)

  productStatuses = Object.values(ProductStatus);
  isSubmitting = signal(false);
  formError = signal<string | null>(null);
  formSuccess = signal<boolean>(false);

  categories = signal<Category[]>([]);
  hierarchicalCategories = signal<Category[]>([]);
  selectedCategories = signal<string[]>([]);

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
    keywords: this.fb.array([]),
    idCategory: [[] as string[], [Validators.required]]
  });

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.categoryService.getAllCategories().pipe(
      tap(categories => this.categories.set(categories)),
      map(categories => this.buildCategoryHierarchy(categories))
    ).subscribe({
      next: hierarchicalCategories => {
        this.hierarchicalCategories.set(hierarchicalCategories);
      },
      error: (error) => {
        this.formError.set('Error al cargar las categorías');
        console.error('Error cargando categorías:', error);
      }
    });
  }

  buildCategoryHierarchy(categories: Category[]): Category[] {
    // Primero obtenemos las categorías de nivel 0 (raíz)
    const rootCategories = categories.filter(c => c.level === 0);

    // Para cada categoría raíz, encontramos sus hijos
    rootCategories.forEach(root => {
      this.findChildCategories(root, categories);
    });

    return rootCategories;
  }

  findChildCategories(parent: Category, allCategories: Category[]) {
    // Encuentra los hijos directos de una categoría
    parent.children = allCategories.filter(
      c => c.parent && c.parent.id === parent.id
    );

    // Recursivamente busca los hijos de esos hijos
    parent.children.forEach(child => {
      this.findChildCategories(child, allCategories);
    });
  }

  onCategoriesChange(categories: string[]) {
    this.selectedCategories.set(categories);
    this.productForm.patchValue({ idCategory: categories });
  }

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
