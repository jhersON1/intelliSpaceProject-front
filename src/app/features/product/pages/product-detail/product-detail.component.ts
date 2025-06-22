import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../interfaces/product.interface';
import { ProductsService } from '../../services/products.service';
import { CommonModule } from '@angular/common';
import { forkJoin, takeUntil, Subject } from 'rxjs';
import { VisualRepresentation } from '../../interfaces/visual-representation.interface';
import { VisualRepresentationService } from '../../services/visual-representation.service';
import { Model3DService } from '../../services/model-3d.service';
import { ExperienceARResponse, Model3DResponse } from '../../interfaces/model-3d.interface';
import { ModelViewerComponent } from '../../components/model-viewer/model-viewer.component';
import { QrCodeComponent } from '../../components/qr-code/qr-code.component';
import { MessagingComponent } from '../../components/messaging/messaging.component';
import { GlobalCleanupService } from '../../../../core/services/global-cleanup.service';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { AuthService } from '../../../../auth/services/auth.service';


@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, ModelViewerComponent, QrCodeComponent, MessagingComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './product-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetailComponent implements OnInit, OnDestroy {  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productsService = inject(ProductsService);  private visualRepresentationService = inject(VisualRepresentationService);
  private model3DService = inject(Model3DService);
  private globalCleanupService = inject(GlobalCleanupService);
  private analyticsService = inject(AnalyticsService);
  private authService = inject(AuthService);

  // Subject para manejar la destrucción del componente
  private readonly destroy$ = new Subject<void>();

  product = signal<Product | null>(null);
  loading = signal(true);
  displayMode = signal<'images' | '3d' | 'ar'>('images');
  images = signal<string[]>([]);
  visualRepresentations = signal<VisualRepresentation[]>([]);
  currentImageIndex = signal(0);
  currentImage = signal<string | null>(null);
  isMobileDevice = signal(false);  // Nuevos signals para 3D/AR - corregidos para manejar arrays
  model3DResponse = signal<Model3DResponse[]>([]);
  experienceARResponse = signal<ExperienceARResponse[]>([]);
  loading3D = signal(false);
  loadingAR = signal(false);  ngOnInit(): void {
    console.log('🏁 ProductDetailComponent initialized');
    
    this.isMobileDevice.set(
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );

    // Suscribirse a cambios de ruta con limpieza automática
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id = params.get('id');
        console.log('📍 Route param changed:', { id });
        if (id) {
          this.loadProduct(id);
        } else {
          this.router.navigate(['/products']);
        }
      });

    // Suscribirse a la señal de limpieza global
    this.globalCleanupService.cleanup$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.resetComponentState();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Resetea el estado del componente durante la limpieza
   */
  private resetComponentState(): void {
    this.product.set(null);
    this.loading.set(true);
    this.images.set([]);
    this.visualRepresentations.set([]);
    this.currentImageIndex.set(0);
    this.currentImage.set(null);
    this.model3DResponse.set([]);
    this.experienceARResponse.set([]);
    this.loading3D.set(false);
    this.loadingAR.set(false);
  }  loadProduct(id: string): void {
    console.log('🔄 loadProduct called with ID:', id);
    this.loading.set(true);

    // ✅ NUEVA ESTRATEGIA: Solo el producto es crítico, el resto es opcional
    // Primero cargar el producto (crítico)
    this.productsService.getProductDetail(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({        next: (product) => {
          console.log('✅ PRODUCT LOADED SUCCESSFULLY (critical):', { productId: product.id, productTitle: product.title });
          this.product.set(product);
          this.loading.set(false);

          // ✅ TRACKING AUTOMÁTICO: Registrar la vista del producto (según la fundamentación teórica)
          // Esto cuenta como demanda/interés del usuario (λ = clicks/día)
          this.trackInteraction('CLICK', 'Product viewed (automatic)');

          // Luego cargar recursos adicionales de forma opcional (no crítica)
          this.loadOptionalResources(id);
        },
        error: (error) => {
          console.error('❌ CRITICAL ERROR - Failed to load product:', error);
          this.loading.set(false);
          this.router.navigate(['/products']);
        }
      });
  }  /**
   * Carga recursos opcionales (imágenes, 3D, AR) sin afectar la carga del producto
   */
  private loadOptionalResources(id: string): void {
    console.log('🔄 Loading optional resources for product:', id);
    
    // Cargar imágenes
    this.visualRepresentationService.findAllImages(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (images) => {
          console.log('✅ Images loaded:', images.length);
          this.visualRepresentations.set(images);
          this.setupImages(images);
        },
        error: (error) => {
          console.warn('⚠️ Failed to load images (non-critical):', error);
          this.setupFallbackImages();
        }
      });

    // Cargar modelo 3D (ahora público)
    this.model3DService.getModel3D(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (model3D) => {
          console.log('✅ Model 3D loaded:', model3D);
          this.model3DResponse.set(Array.isArray(model3D) ? model3D : (model3D ? [model3D] : []));
        },
        error: (error) => {
          console.warn('⚠️ Failed to load 3D model (non-critical):', error);
          this.model3DResponse.set([]);
        }
      });

    // Cargar experiencia AR (ahora público)
    this.model3DService.getExperienceAR(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (experienceAR) => {
          console.log('✅ Experience AR loaded:', experienceAR);
          this.experienceARResponse.set(Array.isArray(experienceAR) ? experienceAR : (experienceAR ? [experienceAR] : []));
        },
        error: (error) => {
          console.warn('⚠️ Failed to load AR experience (non-critical):', error);
          this.experienceARResponse.set([]);
        }
      });
  }setupImages(visualRepresentations: VisualRepresentation[]): void {
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
  // Métodos auxiliares para verificar disponibilidad - corregidos para arrays
  hasModel3D(): boolean {
    const response = this.model3DResponse();
    return !!(response && response.length > 0 && response[0]?.url);
  }

  hasExperienceAR(): boolean {
    const response = this.experienceARResponse();
    return !!(response && response.length > 0 && response[0]?.url);
  }
  // Métodos para obtener URLs de los modelos - corregidos para arrays
  getModel3DUrl(): string | null {
    const response = this.model3DResponse();
    return (response && response.length > 0) ? (response[0]?.url || null) : null;
  }

  getModel3DFormat(): string | null {
    const response = this.model3DResponse();
    return (response && response.length > 0) ? (response[0]?.format || null) : null;
  }

  getIOSModel3DUrl(): string | null {
    const response = this.model3DResponse();
    return (response && response.length > 0) ? (response[0]?.urlIOS3D || null) : null;
  }

  getExperienceARUrl(): string | null {
    const response = this.experienceARResponse();
    return (response && response.length > 0) ? (response[0]?.url || null) : null;
  }

  getIOSARUrl(): string | null {
    const response = this.experienceARResponse();
    return (response && response.length > 0) ? (response[0]?.urlIOSAR || null) : null;
  }

  getARInstructions(): string | null {
    const response = this.experienceARResponse();
    return (response && response.length > 0) ? (response[0]?.instructions || null) : null;
  }

  getARDeviceRequirements(): string[] {
    const response = this.experienceARResponse();
    return (response && response.length > 0) ? (response[0]?.devicerequirements || []) : [];
  }
  // Analytics tracking methods
  onImageClick(imageIndex: number): void {
    this.selectImage(imageIndex);
    this.trackInteraction('CLICK', `Image ${imageIndex + 1} clicked`);
  }

  on3DModelClick(): void {
    this.setDisplayMode('3d');
    this.trackInteraction('CLICK', '3D model viewed');
  }

  onARExperienceClick(): void {
    this.setDisplayMode('ar');
    this.trackInteraction('CLICK', 'AR experience accessed');
  }

  onQRCodeGenerated(): void {
    this.trackInteraction('CLICK', 'QR code generated for AR');
  }
  onImageNavigation(direction: 'next' | 'prev'): void {
    if (direction === 'next') {
      this.nextImage();
    } else {
      this.previousImage();
    }
    this.trackInteraction('CLICK', `Image navigation: ${direction}`);
  }  private trackInteraction(type: 'CLICK' | 'VIEW', description?: string): void {
    const product = this.product();
    if (!product?.id) {
      console.warn('Analytics: Cannot track interaction - no product ID', { type, description });
      return;
    }

    // ⚡ NUEVA VERIFICACIÓN: Evitar clicks duplicados muy rápidos (spam)
    const now = Date.now();
    const cacheKey = `${product.id}_${type}_${description || 'general'}`;
    
    // Cache estático para evitar spam de clicks
    if (!ProductDetailComponent.clickCache) {
      ProductDetailComponent.clickCache = new Map();
    }
    
    const lastClick = ProductDetailComponent.clickCache.get(cacheKey);
    if (lastClick && (now - lastClick) < 1000) { // 1 segundo de cooldown para clicks
      console.warn('Analytics: Click spam prevented', { type, description, productId: product.id });
      return;
    }
    
    ProductDetailComponent.clickCache.set(cacheKey, now);

    const trackingData = {
      productId: product.id,
      interactionType: type,
      duration: 1, // Duración base, se puede ajustar
      userAgent: navigator.userAgent,
      referrer: document.referrer || undefined
    };

    console.log('Analytics: Attempting to track interaction', {
      type,
      description,
      productId: product.id,
      trackingData
    });
    
    this.analyticsService.trackProductInteraction(trackingData).subscribe({
      next: (result) => {
        console.log(`✅ Analytics: ${type} tracked successfully for product ${product.id}`, {
          description,
          result
        });
      },
      error: (error) => {
        console.error('❌ Analytics tracking failed:', {
          error: error.message,
          type,
          productId: product.id,
          description
        });
      }
    });
  }
  
  // Cache estático para prevenir spam de clicks
  private static clickCache: Map<string, number>;
}