import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../interfaces/product.interface';
import { ProductsService } from '../../services/products.service';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { VisualRepresentation } from '../../interfaces/visual-representation.interface';
import { VisualRepresentationService } from '../../services/visual-representation.service';
import { Model3DService } from '../../services/model-3d.service';
import { ExperienceARResponse, Model3DResponse } from '../../interfaces/model-3d.interface';
import { ModelViewerComponent } from '../../components/model-viewer/model-viewer.component';
import { QrCodeComponent } from '../../components/qr-code/qr-code.component';


@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, ModelViewerComponent, QrCodeComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './product-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productsService = inject(ProductsService);
  private visualRepresentationService = inject(VisualRepresentationService);
  private model3DService = inject(Model3DService);

  product = signal<Product | null>(null);
  loading = signal(true);
  displayMode = signal<'images' | '3d' | 'ar'>('images');
  images = signal<string[]>([]);
  visualRepresentations = signal<VisualRepresentation[]>([]);
  currentImageIndex = signal(0);
  currentImage = signal<string | null>(null);
  isMobileDevice = signal(false);

  // Nuevos signals para 3D/AR
  model3DResponse = signal<Model3DResponse | null>(null);
  experienceARResponse = signal<ExperienceARResponse | null>(null);
  loading3D = signal(false);
  loadingAR = signal(false);

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

    // Cargar producto, imágenes, modelo 3D y experiencia AR en paralelo
    forkJoin({
      product: this.productsService.getProductDetail(id),
      images: this.visualRepresentationService.findAllImages(id),
      model3D: this.model3DService.getModel3D(id),
      experienceAR: this.model3DService.getExperienceAR(id)
    }).subscribe({
      next: ({ product, images, model3D, experienceAR }) => {
        this.product.set(product);
        this.visualRepresentations.set(images);
        this.model3DResponse.set(model3D);
        this.experienceARResponse.set(experienceAR);
        this.setupImages(images);
        this.loading.set(false);

        console.log('Producto cargado:', product);
        console.log('Modelo 3D cargado:', model3D);
        console.log('Experiencia AR cargada:', experienceAR);
      },
      error: (error) => {
        console.error('Error al cargar el producto:', error);
        this.loading.set(false);
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
      const imageUrls = visualRepresentations.map(vr => vr.url).filter(url => url);
      this.images.set(imageUrls);

      if (imageUrls.length > 0) {
        this.currentImage.set(imageUrls[0]);
        this.currentImageIndex.set(0);
        return;
      }
    }

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



  setDisplayMode(mode: 'images' | '3d' | 'ar'): void {
    this.displayMode.set(mode);

    if (mode === '3d') {
      console.log('Mostrando visualización 3D');
      if (!this.model3DResponse()) {
        console.warn('No hay modelo 3D disponible para este producto');
      }
    } else if (mode === 'ar') {
      console.log('Mostrando visualización AR');
      if (!this.experienceARResponse()) {
        console.warn('No hay experiencia AR disponible para este producto');
      }
    }
  }

  // Métodos auxiliares para verificar disponibilidad
  hasModel3D(): boolean {
    return !!this.model3DResponse();
  }

  hasExperienceAR(): boolean {
    return !!this.experienceARResponse();
  }

  // Métodos para obtener URLs de los modelos
  getModel3DUrl(): string | null {
    return this.model3DResponse()?.url || null;
  }

  getModel3DFormat(): string | null {
    return this.model3DResponse()?.format || null;
  }

  getIOSModel3DUrl(): string | null {
    return this.model3DResponse()?.urlIOS3D || null;
  }

  getExperienceARUrl(): string | null {
    return this.experienceARResponse()?.url || null;
  }

  getIOSARUrl(): string | null {
    return this.experienceARResponse()?.urlIOSAR || null;
  }

  getARInstructions(): string | null {
    return this.experienceARResponse()?.instructions || null;
  }

  getARDeviceRequirements(): string[] {
    return this.experienceARResponse()?.devicerequirements || [];
  }
}