import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ProductsService, PaginatedResponse } from '../product/services/products.service';
import { Product } from '../product/interfaces/product.interface';
import { VisualRepresentationService } from '../product/services/visual-representation.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ProductTrendAnalysis, TrendingProductsResponse } from '../../core/types/analytics.interface';
import { catchError, forkJoin, of } from 'rxjs';

interface ProductWithImage extends Product {
  imageUrl?: string | string[];
  imageAlt?: string;
  // 🔥 Nuevas propiedades para trending
  trendLabel?: string;
  trendIcon?: string;
  trendRanking?: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private productService = inject(ProductsService);
  private analyticsService = inject(AnalyticsService);
  private visualService = inject(VisualRepresentationService);
  private cd = inject(ChangeDetectorRef);
  private router = inject(Router);

  products: ProductWithImage[] = [];
  loading = false;
  useTrendingProducts = true; // 🔥 Toggle para usar productos trending (público para template)

  ngOnInit(): void {
    this.loadFeaturedProducts();
  }

  /**
   * 🔥 NUEVO: Carga productos trending o productos normales
   */
  private loadFeaturedProducts(): void {
    this.loading = true;
    
    if (this.useTrendingProducts) {
      this.loadTrendingProducts();
    } else {
      this.loadRegularProducts();
    }
  }

  /**
   * 🔥 NUEVO: Carga productos trending usando Holt-Winters
   */
  private loadTrendingProducts(): void {
    console.log('🔥 Cargando productos trending para dashboard...');
    
    this.analyticsService.getTrendingProducts(6).subscribe({
      next: (response: TrendingProductsResponse) => {
        console.log('✅ Trending products recibidos:', response);
        
        if (response && response.products && response.products.length > 0) {
          console.log(`📊 Procesando ${response.products.length} productos trending`);
          this.convertTrendingToProducts(response.products);
        } else {
          console.log('⚠️ No hay productos trending, usando productos regulares...');
          this.useTrendingProducts = false; // Cambiar flag para UI
          this.loadRegularProducts();
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar productos trending:', error);
        console.error('Error details:', {
          status: error.status,
          message: error.message,
          url: error.url
        });
        this.useTrendingProducts = false; // Cambiar flag para UI
        this.loadRegularProducts();
      }
    });
  }

  /**
   * 🔥 NUEVO: Convierte ProductTrendAnalysis a ProductWithImage
   */
  private convertTrendingToProducts(trendingProducts: ProductTrendAnalysis[]): void {
    // Primero obtenemos los productos del servicio de productos
    const productIds = trendingProducts.map(tp => tp.productId);
    
    // Crear observables para obtener cada producto
    const productRequests = productIds.map(id => 
      this.productService.getVendorProduct(id).pipe(
        catchError(() => of(null))
      )
    );

    forkJoin(productRequests).subscribe({
      next: (products) => {
        const validProducts = products.filter(p => p !== null) as Product[];
        
        // Combinar datos de producto con datos de trending
        const productsWithTrend: ProductWithImage[] = validProducts.map(product => {
          const trendData = trendingProducts.find(tp => tp.productId === product.id);
          return {
            ...product,
            trendLabel: trendData?.trendLabel,
            trendIcon: trendData?.trendIcon,
            trendRanking: trendData?.currentComponents.trendRanking
          };
        });

        this.loadProductsWithImages(productsWithTrend);
      },
      error: (error) => {
        console.error('❌ Error al obtener productos trending:', error);
        this.loadRegularProducts();
      }
    });
  }

  /**
   * Carga productos regulares (fallback)
   */
  private loadRegularProducts(): void {
    this.loading = true;
    
    // Cargar solo 6 productos para mostrar en el dashboard
    this.productService.findAllProducts(6, 0).subscribe({
      next: (response: PaginatedResponse<Product>) => {
        if (response.data && response.data.length > 0) {
          this.loadProductsWithImages(response.data);
        } else {
          this.products = [];
          this.loading = false;
          this.cd.markForCheck();
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar productos regulares:', error);
        this.products = [];
        this.loading = false;
        this.cd.markForCheck();
      }
    });
  }

  private loadProductsWithImages(products: Product[]): void {
    if (products.length === 0) {
      this.products = [];
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
          return {
            ...product,
            imageUrl: image?.url || undefined,
            imageAlt: image?.altText || product.title
          };
        });

        this.products = productsWithImages;
        this.loading = false;
        this.cd.markForCheck();
      },
      error: (error) => {
        console.error('❌ Error al cargar imágenes de productos:', error);
        this.products = products.map(product => ({
          ...product,
          imageUrl: undefined,
          imageAlt: product.title
        }));
        this.loading = false;
        this.cd.markForCheck();
      }
    });
  }

  navigateToProductDetail(productId: string): void {
    this.router.navigate(['/home/products', productId, 'detail']);
  }

  /**
   * 🔥 NUEVO: Toggle entre productos trending y regulares
   */
  toggleTrendingMode(): void {
    this.useTrendingProducts = !this.useTrendingProducts;
    console.log(`🔄 Cambiando a modo: ${this.useTrendingProducts ? 'Trending' : 'Regular'}`);
    this.loadFeaturedProducts();
  }

  // Categorías para explorar
  categories = [
    {
      id: 1,
      name: 'Sofas',
      image: 'https://res.cloudinary.com/intellispace-cloudinary/image/upload/v1744227628/taller%20de%20grado/sofas_usny6x.png'
    },
    {
      id: 2,
      name: 'Kitchen',
      image: 'https://res.cloudinary.com/intellispace-cloudinary/image/upload/v1744227630/taller%20de%20grado/kitchen_m9r2tw.png'
    },
    {
      id: 3,
      name: 'Lamp',
      image: 'https://res.cloudinary.com/intellispace-cloudinary/image/upload/v1744227627/taller%20de%20grado/lamp_umv5pt.png'
    },
    {
      id: 4,
      name: 'Table',
      image: 'https://res.cloudinary.com/intellispace-cloudinary/image/upload/v1744227636/taller%20de%20grado/table_gjuqbo.png'
    }
  ];
}
