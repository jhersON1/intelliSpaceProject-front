import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { Category } from '../../interfaces/category.interface';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-category-selector',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './category-selector.component.html',
  styleUrls: ['./category-selector.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategorySelectorComponent {
  @Input() hierarchicalCategories: Category[] = [];
  @Input() selectedCategories: string[] = [];
  @Input() hasError: boolean = false;
  @Input() touched: boolean = false;
  
  @Output() categoriesChange = new EventEmitter<string[]>();
  
  expandedCategories = signal<Record<string, boolean>>({});
  
  ngOnInit(): void {}
  
  // Método para controlar la expansión/contracción de categorías
  toggleExpansion(categoryId: string, event: Event) {
    event.stopPropagation(); // Evita que se propague al checkbox
    
    const currentState = this.expandedCategories();
    this.expandedCategories.set({
      ...currentState,
      [categoryId]: !currentState[categoryId]
    });
  }
  
  // Método para verificar si una categoría está expandida
  isCategoryExpanded(categoryId: string): boolean {
    return !!this.expandedCategories()[categoryId];
  }
  
  toggleCategorySelection(categoryId: string, event: Event) {
    event.stopPropagation(); // Evita conflictos con la expansión
    
    const currentSelections = [...this.selectedCategories];
    const index = currentSelections.indexOf(categoryId);
    
    if (index > -1) {
      currentSelections.splice(index, 1);
    } else {
      currentSelections.push(categoryId);
    }
    
    this.categoriesChange.emit(currentSelections);
  }

  isCategorySelected(categoryId: string): boolean {
    return this.selectedCategories.includes(categoryId);
  }
}
