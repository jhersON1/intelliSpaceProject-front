import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../interfaces/product.interface';
import { ProductsService } from '../../services/products.service';
import { Router } from '@angular/router';
import { VisualRepresentationService } from '../../services/visual-representation.service';
import { catchError, forkJoin, of } from 'rxjs';

interface ProductWithImage extends Product {
  imageUrl?: string | string[];
  imageAlt?: string;
}

@Component({
  selector: 'app-product-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './product-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListComponent implements OnInit {
 private productService = inject(ProductsService);
  private visualService = inject(VisualRepresentationService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  loading = false;
  allProducts: ProductWithImage[] = [];
  displayedProducts: ProductWithImage[] = [];

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
      next: (products) => {
        console.log(products);
        if (products && products.length > 0) {
          this.loadProductsWithImages(products);
        } else {
          console.log('📭 No hay productos');
          this.allProducts = [];
          this.displayedProducts = [];
          this.totalItems = 0;
          this.calculateTotalPages();
          this.loading = false;
          this.cd.markForCheck();
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar productos:', error);
        this.loading = false;
        this.cd.markForCheck();
      }
    });
  }

  private loadProductsWithImages(products: Product[]): void {
    if (products.length === 0) {
      this.allProducts = [];
      this.displayedProducts = [];
      this.totalItems = 0;
      this.calculateTotalPages();
      this.loading = false;
      this.cd.markForCheck();
      return;
    }

    // Crear observables para cargar todas las imágenes en paralelo
    const imageRequests = products.map(product => {
      return this.visualService.findPrincipalImage(product.id).pipe(
        catchError(() => {
          return of(null);
        })
      );
    });

    forkJoin(imageRequests).subscribe({
      next: (images) => {
        const productsWithImages: ProductWithImage[] = products.map((product, index) => {
          const image = images[index];
          const result = {
            ...product,
            imageUrl: image?.url || undefined,
            imageAlt: image?.altText || product.title
          };

          return result;
        });

        this.allProducts = productsWithImages;
        this.totalItems = productsWithImages.length;
        this.calculateTotalPages();
        this.updateDisplayedProducts();
        this.loading = false;
        this.cd.markForCheck();
      },
      error: (error) => {
        console.error('❌ Error en forkJoin:', error);
        const productsWithoutImages = products.map(p => ({ ...p, imageAlt: p.title }));
        this.allProducts = productsWithoutImages;
        this.totalItems = productsWithoutImages.length;
        this.calculateTotalPages();
        this.updateDisplayedProducts();
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

  viewDetails(p: ProductWithImage) {
    console.log('Ver detalles:', p);
    this.router.navigate(['/home/products', p.id, 'detail']);
  }

  addToCart(p: ProductWithImage) {
    console.log('Añadir al carrito:', p);
  }

  // Métodos para el manejo de imágenes
  onImageError(event: Event, product: ProductWithImage): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.style.display = 'none';
    }
  }

  onImageLoad(product: ProductWithImage): void {
    console.log(`✅ Imagen cargada para ${product.title}`);
  }
}
