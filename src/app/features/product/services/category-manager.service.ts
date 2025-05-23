import { inject, Injectable, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { Category } from '../interfaces/category.interface';
import { CategoryService } from './category.service';

@Injectable({
  providedIn: 'root'
})
export class CategoryManagerService {
  private categoryService = inject(CategoryService);

  public hierarchicalCategories = signal<Category[]>([]);
  public selectedCategories = signal<string[]>([]);

  public loadCategories(): Observable<Category[]> {
    return this.categoryService.getAllCategories().pipe(
      map(categories => this.buildCategoryHierarchy(categories)),
      tap(hierarchicalCategories => {
        this.hierarchicalCategories.set(hierarchicalCategories);
      })
    );
  }

  public buildCategoryHierarchy(categories: Category[]): Category[] {
    const rootCategories = categories.filter(c => c.level === 0);

    rootCategories.forEach(root => {
      this.findChildCategories(root, categories);
    });

    return rootCategories;
  }

  public findChildCategories(parent: Category, allCategories: Category[]) {
    parent.children = allCategories.filter(
      c => c.parent && c.parent.id === parent.id
    );

    parent.children.forEach(child => {
      this.findChildCategories(child, allCategories);
    });
  }

  public updateSelectedCategories(categories: string[]) {
    this.selectedCategories.set(categories);
    return categories;
  }
}
