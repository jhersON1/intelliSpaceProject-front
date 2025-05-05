import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../interfaces/product.interface';
import { ProductsService } from '../../services/products.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-product-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './product-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListComponent implements OnInit {
  private productService = inject(ProductsService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  loading = false;
  allProducts: Product[] = [];
  displayedProducts: Product[] = [];

  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    const offset = (this.currentPage - 1) * this.pageSize;

    this.productService.findAllProducts(this.pageSize, offset).subscribe({
      next: prods => {
        console.log(prods);
        this.allProducts = prods;
        this.totalItems = prods.length;
        this.calculateTotalPages();
        this.updateDisplayedProducts();
        this.loading = false;

        this.cd.markForCheck();
      },
      error: () => {
        console.error('Error al cargar los productos');
        this.loading = false;
        this.cd.markForCheck();
      }
    });
  }

  updateDisplayedProducts(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.displayedProducts = this.allProducts.slice(start, start + this.pageSize);
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadProducts();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadProducts();
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadProducts();
  }

  getPages(): number[] {
    const pages: number[] = [];
    const max = 5;
    if (this.totalPages <= max) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, this.currentPage - 2);
      let end = Math.min(this.totalPages, start + max - 1);
      if (end === this.totalPages) start = Math.max(1, end - max + 1);
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  }

  private calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
  }

  viewDetails(p: Product) {
    console.log('Ver detalles:', p);
    this.router.navigate(['/home/products', p.id, 'detail']);
  }

  addToCart(p: Product) {
    console.log('Añadir al carrito:', p);
  }
}
