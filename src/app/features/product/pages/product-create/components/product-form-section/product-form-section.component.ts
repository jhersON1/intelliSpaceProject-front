import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CategorySelectorComponent } from '../../../../components/category-selector/category-selector.component';
import { ProductFormBase } from '../../../../services/productFormBase.service';
import { FormManagerService } from '../../services/form-manager.service';

@Component({
  selector: 'app-product-form-section',
  imports: [CommonModule, ReactiveFormsModule, CategorySelectorComponent],
  templateUrl: './product-form-section.component.html',
})
export class ProductFormSectionComponent implements OnInit {
  private formManager = inject(FormManagerService);
  protected productFormBase = inject(ProductFormBase);

  @Input() productForm!: FormGroup;
  @Output() categoriesChange = new EventEmitter<string[]>();

  readonly productStatuses = this.productFormBase.productStatuses;
  readonly hierarchicalCategories = this.productFormBase.hierarchicalCategories;
  readonly selectedCategories = this.productFormBase.selectedCategories;

  ngOnInit(): void {
    this.loadCategories();
  }

  get keywordControls() {
    return this.formManager.keywordControls;
  }

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

  onCategoriesChange(categories: string[]): void {
    this.formManager.onCategoriesChange(categories);
    this.categoriesChange.emit(categories);
  }

  addKeyword(): void {
    this.formManager.addKeyword();
  }

  removeKeyword(index: number): void {
    this.formManager.removeKeyword(index);
  }
}
