import { Directive, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductStatus } from '../interfaces/product.interface';
import { signal } from '@angular/core';
import { tap, map } from 'rxjs';
import { Category } from '../interfaces/category.interface';
import { CategoryService } from '../services/category.service';

@Directive()
export abstract class ProductFormBase {
  protected fb = inject(FormBuilder);
  protected categoryService = inject(CategoryService);

  public hierarchicalCategories = signal<Category[]>([]);
  public selectedCategories = signal<string[]>([]);
  public formError = signal<string | null>(null);
  public isSubmitting = signal(false);

  public productStatuses = Object.values(ProductStatus);

  /**
   * Carga todas las categorías y construye la jerarquía
   */
  loadCategories() {
    return this.categoryService.getAllCategories().pipe(
      tap(categories => console.log('Categorías cargadas:', categories)),
      map(categories => this.buildCategoryHierarchy(categories)),
      tap(hierarchicalCategories => {
        this.hierarchicalCategories.set(hierarchicalCategories);
      })
    );
  }

  /**
   * Construye la jerarquía de categorías
   */
  buildCategoryHierarchy(categories: Category[]): Category[] {
    const rootCategories = categories.filter(c => c.level === 0);
    rootCategories.forEach(root => {
      this.findChildCategories(root, categories);
    });
    return rootCategories;
  }

  /**
   * Encuentra recursivamente las categorías hijas
   */
  findChildCategories(parent: Category, allCategories: Category[]) {
    parent.children = allCategories.filter(
      c => c.parent && c.parent.id === parent.id
    );
    parent.children.forEach(child => {
      this.findChildCategories(child, allCategories);
    });
  }

  /**
   * Maneja el cambio de categorías seleccionadas
   */
  onCategoriesChange(categories: string[], form: FormGroup) {
    this.selectedCategories.set(categories);
    form.patchValue({ idCategory: categories });
  }

  /**
   * Marca todos los controles del formulario como touched
   */
  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Crea la estructura base del formulario de producto
   */
  createBaseProductForm() {
    return this.fb.group({
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
      idCategory: [[] as string[], [Validators.required]]
    });
  }

  /**
   * Resetea los signals a su estado inicial
   */
  resetSignals() {
    this.formError.set(null);
    this.isSubmitting.set(false);
    this.selectedCategories.set([]);
  }
}