import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ProductsService, PaginatedResponse } from '../product/services/products.service';
import { Product } from '../product/interfaces/product.interface';
import { VisualRepresentationService } from '../product/services/visual-representation.service';
import { catchError, forkJoin, of } from 'rxjs';

interface ProductWithImage extends Product {
  imageUrl?: string | string[];
  imageAlt?: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private productService = inject(ProductsService);
  private visualService = inject(VisualRepresentationService);
  private cd = inject(ChangeDetectorRef);
  private router = inject(Router);

  products: ProductWithImage[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadFeaturedProducts();
  }

  private loadFeaturedProducts(): void {
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
        console.error('❌ Error al cargar productos destacados:', error);
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
      }    });
  }
  navigateToProductDetail(productId: string): void {
    this.router.navigate(['/home/products', productId, 'detail']);
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
