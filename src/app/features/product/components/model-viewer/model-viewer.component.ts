import { 
  Component, 
  ElementRef, 
  ViewChild, 
  Input, 
  OnInit, 
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA,
  signal,
  ChangeDetectionStrategy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Model3D, ModelAnnotation } from '../../interfaces/model-3d.interface';

// Importar model-viewer
import '@google/model-viewer';
import { Model3DService } from '../../services/model-3d.service';

@Component({
  selector: 'app-model-viewer',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="relative w-full h-full bg-gray-50 rounded-lg overflow-hidden">
      @if (model3D()) {
        <!-- Model Viewer -->
        <model-viewer
          #modelViewer
          [src]="model3D()!.url"
          [alt]="model3D()!.altText || 'Modelo 3D'"
          [ios-src]="iosModelUrl()"
          camera-controls
          auto-rotate
          ar
          ar-modes="webxr scene-viewer quick-look"
          [style.width.%]="100"
          [style.height.%]="100"
          class="w-full h-full"
          loading="eager">
          
          <!-- Botón AR integrado -->
          <button 
            slot="ar-button" 
            class="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded-full px-4 py-2 shadow-lg hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2 text-blue-600 font-medium text-sm">
            <img src="./ic_view_in_ar_new_googblue_48dp.png" alt="AR" class="w-5 h-5">
            Ver en AR
          </button>

          <!-- Hotspots/Anotaciones -->
          @for (annotation of annotations(); track annotation.id) {
            <button 
              class="bg-white rounded-full px-3 py-2 shadow-lg text-sm font-medium hover:shadow-xl transition-shadow duration-200 text-gray-800"
              [attr.slot]="'hotspot-' + annotation.id"
              [attr.data-position]="getHotspotPosition(annotation)"
              [attr.data-normal]="getHotspotNormal(annotation)">
              {{ annotation.title }}
            </button>
          }
        </model-viewer>

        <!-- Controles superpuestos -->
        <div class="absolute inset-0 pointer-events-none">
          <!-- Botón pantalla completa -->
          <button 
            (click)="toggleFullscreen()"
            class="pointer-events-auto absolute bottom-4 right-16 bg-black bg-opacity-50 text-white rounded-full p-3 hover:bg-opacity-70 transition-all duration-200 group">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
            </svg>
            <span class="absolute bottom-full right-0 mb-2 px-2 py-1 bg-black bg-opacity-75 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Pantalla completa
            </span>
          </button>

          <!-- Botón ayuda -->
          <button 
            (click)="toggleHelp()"
            class="pointer-events-auto absolute bottom-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-3 hover:bg-opacity-70 transition-all duration-200 group">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="absolute bottom-full right-0 mb-2 px-2 py-1 bg-black bg-opacity-75 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Ayuda
            </span>
          </button>
        </div>

        <!-- Modal de ayuda -->
        @if (showHelp()) {
          <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 pointer-events-auto">
            <div class="bg-white rounded-lg p-6 max-w-md mx-4 relative">
              <button 
                (click)="toggleHelp()"
                class="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
              
              <h3 class="text-lg font-semibold mb-4">Controles del visor 3D</h3>
              <div class="space-y-3 text-sm">
                <div class="flex items-start gap-3">
                  <div class="bg-gray-100 rounded px-2 py-1 font-mono text-xs">Mouse</div>
                  <p>Arrastra para rotar el modelo</p>
                </div>
                <div class="flex items-start gap-3">
                  <div class="bg-gray-100 rounded px-2 py-1 font-mono text-xs">Scroll</div>
                  <p>Acerca o aleja el modelo</p>
                </div>
                <div class="flex items-start gap-3">
                  <div class="bg-gray-100 rounded px-2 py-1 font-mono text-xs">AR</div>
                  <p>Usa el botón "Ver en AR" para visualizar en tu espacio</p>
                </div>
                <div class="flex items-start gap-3">
                  <div class="bg-gray-100 rounded px-2 py-1 font-mono text-xs">Móvil</div>
                  <p>Toca y arrastra para interactuar</p>
                </div>
              </div>
            </div>
          </div>
        }

      } @else {
        <!-- Estado de carga/error -->
        <div class="flex items-center justify-center h-full">
          <div class="text-center">
            <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p class="text-gray-500">{{ loadingMessage() }}</p>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModelViewerComponent implements OnInit, AfterViewInit {

  private model3DService = inject(Model3DService);
  @ViewChild('modelViewer', { static: false }) modelViewerRef!: ElementRef;
  
  @Input() set model(value: Model3D | null) {
    this.model3D.set(value);
  }
  
  @Input() set productId(value: string) {
    this.currentProductId.set(value);
  }

  // Signals
  model3D = signal<Model3D | null>(null);
  currentProductId = signal<string>('');
  showHelp = signal<boolean>(false);
  isFullscreen = signal<boolean>(false);
  loadingMessage = signal<string>('Cargando modelo 3D...');
  iosModelUrl = signal<string>('');
  
  // Datos mock de anotaciones
  annotations = signal<ModelAnnotation[]>([
    {
      id: '1',
      title: 'Detalle',
      content: 'Característica destacada',
      position: { x: 0, y: 0.5, z: 0 }
    }
  ]);

  ngOnInit(): void {
    const model = this.model3D();
    const productId = this.currentProductId();
    
    if (model && productId) {
      // ✅ Usar el servicio para obtener la URL correcta de iOS
      const iosUrl = this.model3DService.getIOSModelUrl(productId);
      this.iosModelUrl.set(iosUrl);
      console.log('iOS model URL configurada:', iosUrl);
    }
  }

  ngAfterViewInit(): void {
    if (this.modelViewerRef?.nativeElement) {
      const modelViewer = this.modelViewerRef.nativeElement;
      
      modelViewer.addEventListener('load', () => {
        console.log('Modelo 3D cargado exitosamente');
        this.loadingMessage.set('Modelo cargado');
      });

      modelViewer.addEventListener('error', (event: any) => {
        console.error('Error cargando modelo 3D:', event);
        this.loadingMessage.set('Error al cargar el modelo 3D');
      });
    }
  }

  toggleHelp(): void {
    this.showHelp.update(show => !show);
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      this.modelViewerRef.nativeElement.requestFullscreen();
      this.isFullscreen.set(true);
    } else {
      document.exitFullscreen();
      this.isFullscreen.set(false);
    }
  }

  getHotspotPosition(annotation: ModelAnnotation): string {
    return `${annotation.position.x} ${annotation.position.y} ${annotation.position.z}`;
  }

  getHotspotNormal(annotation: ModelAnnotation): string {
    return "0 1 0";
  }
}