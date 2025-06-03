import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CategorySelectorComponent } from '../../../../components/category-selector/category-selector.component';
import { ProductFormBase } from '../../../../services/productFormBase.service';
import { FormManagerService } from '../../services/form-manager.service';

@Component({
  selector: 'app-product-form-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CategorySelectorComponent],
  templateUrl: './product-form-section.component.html',
})
export class ProductFormSectionComponent implements OnInit {
  private formManager = inject(FormManagerService);
  protected productFormBase = inject(ProductFormBase);

  @Input() productForm!: FormGroup;
  @Output() categoriesChange = new EventEmitter<string[]>();

  // Propiedades expuestas del servicio
  readonly productStatuses = this.productFormBase.productStatuses;
  readonly hierarchicalCategories = this.productFormBase.hierarchicalCategories;
  readonly selectedCategories = this.productFormBase.selectedCategories;

  ngOnInit(): void {
    // Cargar las categorías cuando se inicializa el componente
    this.loadCategories();
  }

  get keywordControls() {
    return this.formManager.keywordControls;
  }

  /**
   * Carga las categorías disponibles desde el servicio.
   */
  private loadCategories(): void {
    this.productFormBase.loadCategories().subscribe({
      next: () => {
        // Categorías cargadas exitosamente
      },
      error: (error) => {
        console.error('Error al cargar las categorías', error);
      }
    });
  }

  /**
   * Maneja los cambios en la selección de categorías.
   */
  onCategoriesChange(categories: string[]): void {
    this.formManager.onCategoriesChange(categories);
    this.categoriesChange.emit(categories);
  }

  /**
   * Agrega un nuevo campo de keyword.
   */
  addKeyword(): void {
    this.formManager.addKeyword();
  }

  /**
   * Elimina un campo de keyword específico.
   */
  removeKeyword(index: number): void {
    this.formManager.removeKeyword(index);
  }
}
