import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Product } from '../../interfaces/product.interface';
import { ProductsService } from '../../services/products.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, of, forkJoin } from 'rxjs';
import { VisualRepresentationService } from '../../services/visual-representation.service';
import { HttpErrorResponse } from '@angular/common/http';

interface ProductWithImage extends Product {
  imageUrl?: string | string[];
  imageAlt?: string;
}

@Component({
  selector: 'app-product-vendor-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './product-vendor-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductVendorListComponent {
  private productService = inject(ProductsService);
  private visualService = inject(VisualRepresentationService);
  private router = inject(Router);

  loading = signal(false);
  allProducts = signal<ProductWithImage[]>([]);
  currentPage = signal(1);
  pageSize = signal(10);
  initialized = signal(false);

  totalItems = computed(() => this.allProducts().length);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  displayedProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const displayed = this.allProducts().slice(start, start + this.pageSize());

    return displayed;
  });

  // Effect para cargar productos cuando cambia la página (solo después de inicializar)
  private loadProductsEffect = effect(() => {
    if (this.initialized()) {
      this.loadProducts();
    }
  });

  ngOnInit(): void {
    this.initialized.set(true);
  }

  private loadProducts(): void {
    this.loading.set(true);
    const offset = (this.currentPage() - 1) * this.pageSize();

    this.productService.findVendorProducts(this.pageSize(), offset).subscribe({
      next: (products) => {
        if (products && products.length > 0) {
          this.loadProductsWithImages(products);
        } else {
          console.log('📭 No hay productos');
          this.allProducts.set([]);
          this.loading.set(false);
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar productos:', error);
        this.loading.set(false);
      }
    });
  }

  private loadProductsWithImages(products: Product[]): void {

    if (products.length === 0) {
      this.allProducts.set([]);
      this.loading.set(false);
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

        this.allProducts.set(productsWithImages);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ Error en forkJoin:', error);
        const productsWithoutImages = products.map(p => ({ ...p, imageAlt: p.title }));
        this.allProducts.set(productsWithoutImages);
        this.loading.set(false);
      }
    });
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  getPages(): number[] {
    const pages: number[] = [];
    const max = 5;
    const totalPages = this.totalPages();
    const currentPage = this.currentPage();

    if (totalPages <= max) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + max - 1);
      if (end === totalPages) start = Math.max(1, end - max + 1);
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  }

  viewDetails(product: ProductWithImage): void {
    this.router.navigate(['/home/products', product.id, 'detail']);
  }

  editProduct(product: ProductWithImage): void {
    this.router.navigate(['/home/products', product.id]);
  }

  // Método para debug en el template
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
