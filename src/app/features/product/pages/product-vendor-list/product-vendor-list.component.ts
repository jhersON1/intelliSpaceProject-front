import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Product } from '../../interfaces/product.interface';
import { ProductsService, PaginatedResponse } from '../../services/products.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, of, forkJoin, takeUntil, Subject } from 'rxjs';
import { VisualRepresentationService } from '../../services/visual-representation.service';
import { GlobalCleanupService } from '../../../../core/services/global-cleanup.service';

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
export class ProductVendorListComponent implements OnInit, OnDestroy {
  private productService = inject(ProductsService);
  private visualService = inject(VisualRepresentationService);
  private router = inject(Router);
  private globalCleanupService = inject(GlobalCleanupService);

  // Subject para manejar la destrucción del componente
  private readonly destroy$ = new Subject<void>();

  loading = signal(false);
  displayedProducts = signal<ProductWithImage[]>([]);
  currentPage = signal(1);
  pageSize = signal(10);
  initialized = signal(false);
  totalItems = signal(0);
  hasMore = signal(false);

  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  // Effect para cargar productos cuando cambia la página (solo después de inicializar)
  private loadProductsEffect = effect(() => {
    if (this.initialized()) {
      this.loadProducts();
    }
  });
  ngOnInit(): void {
    // Suscribirse a la señal de limpieza global
    this.globalCleanupService.cleanup$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.resetComponentState();
      });

    this.initialized.set(true);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Resetea el estado del componente durante la limpieza
   */
  private resetComponentState(): void {
    this.loading.set(false);
    this.displayedProducts.set([]);
    this.currentPage.set(1);
    this.initialized.set(false);
    this.totalItems.set(0);
    this.hasMore.set(false);
  }  private loadProducts(): void {
    this.loading.set(true);
    const offset = (this.currentPage() - 1) * this.pageSize();

    this.productService.findVendorProducts(this.pageSize(), offset)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedResponse<Product>) => {
          console.log('📦 Respuesta paginada del vendor:', response);
          
          if (response.data && response.data.length > 0) {
            this.totalItems.set(response.total);
            this.hasMore.set(response.hasMore);
            this.loadProductsWithImages(response.data);
          } else {
            console.log('📭 No hay productos del vendor');
            this.displayedProducts.set([]);            this.totalItems.set(0);
            this.hasMore.set(false);
            this.loading.set(false);
          }
        },
        error: (error) => {
          console.error('❌ Error al cargar productos del vendor:', error);
          this.loading.set(false);
        }
      });
  }

  private loadProductsWithImages(products: Product[]): void {

    if (products.length === 0) {
      this.displayedProducts.set([]);
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
    });    forkJoin(imageRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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

          this.displayedProducts.set(productsWithImages);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('❌ Error en forkJoin:', error);
          const productsWithoutImages = products.map(p => ({ ...p, imageAlt: p.title }));
          this.displayedProducts.set(productsWithoutImages);
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
    // Usamos hasMore para determinar si hay una página siguiente disponible
    if (this.hasMore() || this.currentPage() < this.totalPages()) {
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
    
    // Si hay más páginas disponibles, asegurémonos de mostrar al menos la página siguiente
    if (this.hasMore() && pages.length > 0) {
      const lastPage = pages[pages.length - 1];
      if (currentPage === lastPage) {
        pages.push(lastPage + 1);
      }
    }
    
    return pages;
  }

  viewDetails(product: ProductWithImage): void {
    this.router.navigate(['/home/products', product.id, 'detail']);
  }

  editProduct(product: ProductWithImage): void {
    this.router.navigate(['/home/products', product.id]);
  }
  deleteProduct(product: ProductWithImage): void {
    if (confirm(`¿Estás seguro de que deseas eliminar el producto "${product.title}"?`)) {
      this.loading.set(true);
      
      this.productService.deleteProduct(product.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('✅ Producto eliminado exitosamente');
            // Recargar la página actual para actualizar la lista
            this.loadProducts();
          },
          error: (error) => {
            console.error('❌ Error al eliminar producto:', error);
            this.loading.set(false);
            alert('Error al eliminar el producto. Por favor, inténtalo de nuevo.');
          }
        });
    }
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
