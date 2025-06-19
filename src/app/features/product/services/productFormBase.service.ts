import { Directive, inject, Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ProductStatus } from '../interfaces/product.interface';
import { signal } from '@angular/core';
import { tap, map } from 'rxjs';
import { Category } from '../interfaces/category.interface';
import { CategoryService } from './category.service';

@Injectable({
  providedIn: 'root'
})
export class ProductFormBase {
  protected fb = inject(FormBuilder);
  protected categoryService = inject(CategoryService);

  public hierarchicalCategories = signal<Category[]>([]);
  public selectedCategories = signal<string[]>([]);
  public formError = signal<string | null>(null);
  public isSubmitting = signal(false);

  public productStatuses = Object.values(ProductStatus);
  /**
   * Validador personalizado para el stock según el estado del producto
   */
  private stockValidator(control: AbstractControl): ValidationErrors | null {
    const parent = control.parent;
    if (!parent) return null;

    const stock = control.value;
    const state = parent.get('state')?.value;

    // Si el stock es null o undefined, no es válido
    if (stock === null || stock === undefined || stock === '') {
      return { required: true };
    }

    // El stock debe ser un número no negativo
    if (stock < 0) {
      return { min: { min: 0, actual: stock } };
    }

    // Si el estado es "Agotado", el stock puede ser 0
    if (state === ProductStatus.SOLD_OUT && stock === 0) {
      return null;
    }

    // Si el estado es "Disponible", el stock debe ser mayor a 0
    if (state === ProductStatus.AVAILABLE && stock === 0) {
      return { stockZeroNotAllowed: true };
    }

    // Si el stock es mayor a 0, siempre es válido
    if (stock > 0) {
      return null;
    }

    return null;
  }
  /**
   * Carga todas las categorías y construye la jerarquía
   */
  loadCategories() {
    return this.categoryService.getAllCategories().pipe(
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
    const form = this.fb.group({
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
      stock: [null, [Validators.required, this.stockValidator.bind(this)]],
      state: [ProductStatus.AVAILABLE, Validators.required],
      idCategory: [[] as string[], [Validators.required]]
    });

    // Añadir listener para revalidar stock cuando cambie el estado
    form.get('state')?.valueChanges.subscribe(() => {
      const stockControl = form.get('stock');
      if (stockControl) {
        stockControl.updateValueAndValidity();
      }
    });

    return form;
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