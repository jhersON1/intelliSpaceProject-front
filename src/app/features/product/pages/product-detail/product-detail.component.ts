import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../interfaces/product.interface';
import { ProductsService } from '../../services/products.service';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { VisualRepresentation } from '../../interfaces/visual-representation.interface';
import { VisualRepresentationService } from '../../services/visual-representation.service';

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
  private visualRepresentationService = inject(VisualRepresentationService);

  product = signal<Product | null>(null);
  loading = signal(true);
  displayMode = signal<'images' | '3d' | 'ar'>('images');
  images = signal<string[]>([]);
  visualRepresentations = signal<VisualRepresentation[]>([]);
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
    
    // Cargar producto y todas sus imágenes en paralelo
    forkJoin({
      product: this.productsService.getProductDetail(id),
      images: this.visualRepresentationService.findAllImages(id)
    }).subscribe({
      next: ({ product, images }) => {
        this.product.set(product);
        this.visualRepresentations.set(images);
        this.setupImages(images);
        this.loading.set(false);
        
        if (this.displayMode() === '3d') {
          console.log('Aquí va la implementación de la visualización 3D');
        } else if (this.displayMode() === 'ar') {
          console.log('Aquí va la implementación de la visualización en Realidad Aumentada');
        }
      },
      error: (error) => {
        console.error('Error al cargar el producto o las imágenes:', error);
        this.loading.set(false);
        // Si falla la carga de imágenes, intentar cargar solo el producto
        this.loadProductOnly(id);
      }
    });
  }

  private loadProductOnly(id: string): void {
    this.productsService.getProductDetail(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.setupFallbackImages();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar el producto:', error);
        this.loading.set(false);
        this.router.navigate(['/products']);
      }
    });
  }

  setupImages(visualRepresentations: VisualRepresentation[]): void {
    if (visualRepresentations && visualRepresentations.length > 0) {
      // Usar las imágenes del servicio de visual representations
      const imageUrls = visualRepresentations.map(vr =>vr.url).filter(url => url);
      this.images.set(imageUrls);
      
      if (imageUrls.length > 0) {
        this.currentImage.set(imageUrls[0]);
        this.currentImageIndex.set(0);
        return;
      }
    }
    
    // Fallback a las imágenes del producto si no hay visual representations
    this.setupFallbackImages();
  }

  private setupFallbackImages(): void {
    const currentProduct = this.product();
    if (!currentProduct) return;
    
    if (currentProduct.imageUrl) {
      if (Array.isArray(currentProduct.imageUrl)) {
        this.images.set(currentProduct.imageUrl);
      } else {
        this.images.set([currentProduct.imageUrl]);
      }
      
      if (this.images().length > 0) {
        this.currentImage.set(this.images()[0]);
        this.currentImageIndex.set(0);
      }
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

  // Métodos para navegación de imágenes con teclado
  nextImage(): void {
    const totalImages = this.images().length;
    if (totalImages > 1) {
      const nextIndex = (this.currentImageIndex() + 1) % totalImages;
      this.selectImage(nextIndex);
    }
  }

  previousImage(): void {
    const totalImages = this.images().length;
    if (totalImages > 1) {
      const prevIndex = this.currentImageIndex() === 0 ? totalImages - 1 : this.currentImageIndex() - 1;
      this.selectImage(prevIndex);
    }
  }
}
