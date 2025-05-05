import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../interfaces/product.interface';
import { ProductsService } from '../../services/products.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule],
  templateUrl: './product-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productsService = inject(ProductsService);

  product = signal<Product | null>(null);
  loading = signal(true);
  displayMode = signal<'images' | '3d' | 'ar'>('images');
  images = signal<string[]>([]);
  currentImageIndex = signal(0);
  currentImage = signal<string | null>(null);
  isMobileDevice = signal(false);

  ngOnInit(): void {
    this.isMobileDevice.set(
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
    
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadProduct(id);
      } else {
        this.router.navigate(['/products']);
      }
    });
  }

  loadProduct(id: string): void {
    this.loading.set(true);
    this.productsService.getProductDetail(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.setupImages();
        this.loading.set(false);
        
        if (this.displayMode() === '3d') {
          console.log('Aquí va la implementación de la visualización 3D');
        } else if (this.displayMode() === 'ar') {
          console.log('Aquí va la implementación de la visualización en Realidad Aumentada');
        }
      },
      error: (error) => {
        console.error('Error al cargar el producto:', error);
        this.loading.set(false);
        this.router.navigate(['/products']);
      }
    });
  }

  setupImages(): void {
    const currentProduct = this.product();
    if (!currentProduct) return;
    
    if (currentProduct.imageUrl) {
      if (Array.isArray(currentProduct.imageUrl)) {
        this.images.set(currentProduct.imageUrl);
      } else {
        this.images.set([currentProduct.imageUrl]);
      }
      this.currentImage.set(this.images()[0]);
    }
  }

  selectImage(index: number): void {
    this.currentImageIndex.set(index);
    this.currentImage.set(this.images()[index]);
  }

  setDisplayMode(mode: 'images' | '3d' | 'ar'): void {
    this.displayMode.set(mode);
    
    if (mode === '3d') {
      console.log('Aquí va la implementación de la visualización 3D');
    } else if (mode === 'ar') {
      console.log('Aquí va la implementación de la visualización en Realidad Aumentada');
    }
  }

  getDimensionsString(): string {
    const currentProduct = this.product();
    if (!currentProduct?.dimensions) return 'No disponible';
    
    const dim = currentProduct.dimensions as any;
    if (dim.width && dim.height && dim.depth) {
      return `${dim.width} × ${dim.height} × ${dim.depth} cm`;
    }
    return JSON.stringify(dim).replace(/[{}"]/g, '');
  }

  navigateToProducts(): void {
    this.router.navigate(['/products']);
  }
}
